use futures::TryStreamExt;
use mongodb::bson::{Document, doc};
use mongodb::options::{ClientOptions, IndexOptions};
use mongodb::{Client, Collection, IndexModel};
use rocket::serde::json::serde_json;
use rocket::serde::{Deserialize, Serialize};
use rustemon::client::RustemonClient;
use rustemon::model::moves::Move;
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies};
use std::fmt;

/// Why a Pokébox lookup failed. Routes map these to HTTP statuses, so a
/// missing Pokémon (404) is never confused with a broken dependency.
#[derive(Debug, Clone, PartialEq)]
pub enum PokeboxError {
    /// The Pokémon doesn't exist: PokeAPI answered 404.
    NotFound,
    /// PokeAPI was unreachable, failed, or sent something unexpected.
    Upstream(String),
    /// MongoDB failed.
    Db(String),
}

impl fmt::Display for PokeboxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PokeboxError::NotFound => write!(f, "pokemon not found"),
            PokeboxError::Upstream(e) => write!(f, "pokeapi error: {e}"),
            PokeboxError::Db(e) => write!(f, "database error: {e}"),
        }
    }
}

impl std::error::Error for PokeboxError {}

impl From<mongodb::error::Error> for PokeboxError {
    fn from(err: mongodb::error::Error) -> Self {
        PokeboxError::Db(err.to_string())
    }
}

fn upstream(err: impl fmt::Display) -> PokeboxError {
    PokeboxError::Upstream(err.to_string())
}

pub type PokeboxResult<T> = Result<T, PokeboxError>;

#[async_trait::async_trait]
pub trait PokeboxDb: Send + Sync {
    async fn get_pokedex(&self) -> PokeboxResult<Vec<PokedexEntry>>;
    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxResult<PokeboxEntry>;
    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxResult<PokeboxEntry>;
    async fn store_pokemon(&self, pokemon: &PokeboxEntry) -> PokeboxResult<()>;
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PokedexEntry {
    pub name: String,
    pub id: i64,
}

#[derive(Serialize, Deserialize)]
pub struct PokemonDeets {
    pub pokemon: Pokemon,
    pub abilities: Vec<Ability>,
    pub moves: Vec<Move>,
    pub species: PokemonSpecies,
}

#[derive(Serialize, Deserialize)]
pub struct PokemonMove {
    name: String,
    description: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PokemonAbility {
    pub name: String,
    pub flavour_text: String,
    pub effect: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PokeboxEntry {
    pub name: String,
    pub id: i64,
    /// English form name ("Alolan Form"), or "" when the form has none.
    pub form_name: String,
    /// The form's own English flavour text if it has one, else the species'.
    pub species_description: String,
    pub types: Vec<String>,
    pub abilities: Vec<PokemonAbility>,
    pub sprites: serde_json::Value,
    /// The species' other forms, never this one.
    pub varieties: Vec<PokemonVariety>,
}

/// Another form of the same species, complete so clients can switch to it
/// without another request.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PokemonVariety {
    pub name: String,
    pub id: i64,
    pub form_name: String,
    pub is_default: bool,
    pub species_description: String,
    pub types: Vec<String>,
    pub abilities: Vec<PokemonAbility>,
    pub sprites: serde_json::Value,
}

/// One PokeAPI `pokemon` resource and what it needs besides the species: its
/// abilities (in the order it lists them, minus any that failed to fetch),
/// its raw `sprites` and its first `pokemon-form`.
pub struct FetchedPokemon {
    pub pokemon: Pokemon,
    pub sprites: serde_json::Value,
    pub abilities: Vec<Ability>,
    pub form: FormText,
}

/// The parts of a PokeAPI `pokemon-form` the Pokébox uses. Read from the raw
/// JSON because rustemon's model has no `flavor_text_entries`.
#[derive(Deserialize, Debug, Default, Clone)]
pub struct FormText {
    #[serde(default)]
    pub form_names: Vec<LocalizedText>,
    #[serde(default)]
    pub flavor_text_entries: Vec<LocalizedFlavorText>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct LocalizedText {
    pub name: String,
    pub language: Language,
}

#[derive(Deserialize, Debug, Clone)]
pub struct LocalizedFlavorText {
    pub flavor_text: String,
    pub language: Language,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Language {
    pub name: String,
}

/// How a Pokémon was asked for.
enum PokemonKey<'a> {
    Id(i64),
    Name(&'a str),
}

impl PokemonKey<'_> {
    fn filter(&self) -> Document {
        match self {
            // Entries stored before varieties existed don't match, so they're
            // refetched and replaced.
            PokemonKey::Id(id) => doc! { "id": id, "varieties": { "$exists": true } },
            PokemonKey::Name(name) => doc! { "name": name, "varieties": { "$exists": true } },
        }
    }
}

impl fmt::Display for PokemonKey<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PokemonKey::Id(id) => write!(f, "{id}"),
            PokemonKey::Name(name) => write!(f, "{name}"),
        }
    }
}

const POKEAPI_URL: &str = "https://pokeapi.co/api/v2";
const LOCAL_API: &str = "http://pokeapi-app-1:80/api/v2";

/// MongoDB-backed Pokébox: serves stored Pokémon, and fetches, stores and
/// returns the ones that aren't stored yet from PokeAPI.
pub struct MongoDb {
    client: Client,
    rustemon: RustemonClient,
    http: reqwest::Client,
    api_base: String,
}

impl MongoDb {
    /// Wraps a client, building the PokeAPI clients once for every request,
    /// and makes sure the collection has its unique index.
    pub async fn new(client: Client) -> Self {
        let use_local = matches!(std::env::var("LOCAL_API").as_deref(), Ok("true"));
        let api_base = if use_local { LOCAL_API } else { POKEAPI_URL };
        eprintln!("using pokeapi at {api_base}");

        let rustemon = if use_local {
            rustemon::client::RustemonClientBuilder::<rustemon::client::CACacheManager>::default()
                .with_environment(rustemon::client::Environment::Custom(api_base.to_string()))
                .try_build()
                .unwrap_or_else(|err| {
                    eprintln!("Failed to build Rustemon client for the local api: {err}");
                    RustemonClient::default()
                })
        } else {
            RustemonClient::default()
        };

        let db = MongoDb {
            client,
            rustemon,
            http: reqwest::Client::new(),
            api_base: api_base.to_string(),
        };
        db.ensure_indexes().await;
        db
    }

    fn collection<T: Send + Sync>(&self) -> Collection<T> {
        self.client.database("pokemon").collection("pokemon")
    }

    /// A unique index on `id`, so concurrent first lookups of the same
    /// Pokémon can't store it twice. Failing to create it (Mongo not up yet,
    /// or duplicates already stored) is logged rather than fatal; upserts
    /// still keep new writes from duplicating.
    async fn ensure_indexes(&self) {
        let index = IndexModel::builder()
            .keys(doc! { "id": 1 })
            .options(IndexOptions::builder().unique(true).build())
            .build();
        if let Err(err) = self.collection::<Document>().create_index(index).await {
            eprintln!(
                "WARNING: could not create the unique index on pokemon.id ({err}). \
                 If duplicates are already stored, remove them and restart."
            );
        }
    }

    async fn get_pokemon(&self, key: PokemonKey<'_>) -> PokeboxResult<PokeboxEntry> {
        let stored = self
            .collection::<PokeboxEntry>()
            .find_one(key.filter())
            .projection(doc! { "_id": 0 })
            .await?;
        if let Some(pokemon) = stored {
            return Ok(pokemon);
        }

        let entry = self.fetch_from_pokeapi(&key).await?;
        // The lookup still succeeded, so a failed store only costs a refetch
        // next time.
        if let Err(err) = self.store_pokemon(&entry).await {
            eprintln!("Failed to store pokemon {}: {err}", entry.id);
        }
        Ok(entry)
    }

    /// GETs `path` under the PokeAPI base as JSON. PokeAPI's 404 is NotFound;
    /// any other failure is Upstream.
    async fn fetch_json(&self, path: &str) -> PokeboxResult<serde_json::Value> {
        let response = self
            .http
            .get(format!("{}/{path}", self.api_base))
            .send()
            .await
            .map_err(upstream)?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(PokeboxError::NotFound);
        }
        response
            .error_for_status()
            .map_err(upstream)?
            .json()
            .await
            .map_err(upstream)
    }

    /// One `pokemon` resource with its abilities, sprites and form text.
    async fn fetch_pokemon(&self, key: &PokemonKey<'_>) -> PokeboxResult<FetchedPokemon> {
        // Fetched directly rather than through rustemon: rustemon doesn't
        // expose the status code (so a 404 can't be told from an outage), and
        // its model drops sprite fields the clients use.
        let raw = self.fetch_json(&format!("pokemon/{key}")).await?;
        let pokemon = Pokemon::deserialize(&raw).map_err(upstream)?;
        let sprites = extract_sprites_from_pokeapi_response(&raw)
            .unwrap_or_else(|_| serde_json::to_value(&pokemon.sprites).unwrap_or_default());

        let abilities = futures::future::join_all(
            pokemon
                .abilities
                .iter()
                .filter_map(|ab| ab.ability.as_ref())
                .map(|ab| async move {
                    rustemon::pokemon::ability::get_by_name(&ab.name, &self.rustemon)
                        .await
                        .map_err(|err| eprintln!("Failed to fetch ability {}: {err}", ab.name))
                        .ok()
                }),
        );
        let (abilities, form) = futures::join!(abilities, self.fetch_form(&pokemon));

        Ok(FetchedPokemon {
            sprites,
            abilities: abilities.into_iter().flatten().collect(),
            form: form?,
            pokemon,
        })
    }

    /// The Pokémon's first `pokemon-form`. Missing forms just mean no form
    /// text; other failures are Upstream like any other lookup.
    async fn fetch_form(&self, pokemon: &Pokemon) -> PokeboxResult<FormText> {
        let Some(form) = pokemon.forms.first() else {
            return Ok(FormText::default());
        };
        match self.fetch_json(&format!("pokemon-form/{}", form.name)).await {
            Ok(raw) => FormText::deserialize(&raw).map_err(upstream),
            Err(PokeboxError::NotFound) => Ok(FormText::default()),
            Err(err) => Err(err),
        }
    }

    async fn fetch_from_pokeapi(&self, key: &PokemonKey<'_>) -> PokeboxResult<PokeboxEntry> {
        let main = self.fetch_pokemon(key).await?;
        let species =
            rustemon::pokemon::pokemon_species::get_by_name(&main.pokemon.species.name, &self.rustemon)
                .await
                .map_err(upstream)?;

        let others = species
            .varieties
            .iter()
            .map(|v| v.pokemon.name.as_str())
            .filter(|name| *name != main.pokemon.name);
        let fetched = futures::future::join_all(
            others.map(|name| async move { (name, self.fetch_pokemon(&PokemonKey::Name(name)).await) }),
        )
        .await;

        // A variety PokeAPI doesn't have is skipped; any other failure fails
        // the lookup, so an entry missing forms is never stored.
        let mut varieties = Vec::new();
        for (name, result) in fetched {
            match result {
                Ok(variety) => varieties.push(variety),
                Err(PokeboxError::NotFound) => eprintln!("Variety {name} not found, skipping it"),
                Err(err) => return Err(err),
            }
        }

        Ok(to_pokebox_entry(main, species, varieties))
    }
}

#[async_trait::async_trait]
impl PokeboxDb for MongoDb {
    async fn get_pokedex(&self) -> PokeboxResult<Vec<PokedexEntry>> {
        let cursor = self
            .collection::<PokedexEntry>()
            .find(doc! { "id": { "$exists": true } })
            .projection(doc! { "_id": 0, "id": 1, "name": 1 })
            .sort(doc! { "id": 1 })
            .await?;
        Ok(cursor.try_collect().await?)
    }

    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxResult<PokeboxEntry> {
        self.get_pokemon(PokemonKey::Id(id)).await
    }

    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxResult<PokeboxEntry> {
        self.get_pokemon(PokemonKey::Name(name)).await
    }

    /// Upserts by id, so storing the same Pokémon twice keeps one copy.
    async fn store_pokemon(&self, pokemon: &PokeboxEntry) -> PokeboxResult<()> {
        self.collection::<PokeboxEntry>()
            .replace_one(doc! { "id": pokemon.id }, pokemon)
            .upsert(true)
            .await?;
        Ok(())
    }
}

pub async fn create_db() -> std::result::Result<Client, Box<dyn std::error::Error>> {
    let uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://admin:testtest@localhost:27017".to_string());
    println!("connecting to mongo at: {}", uri);
    let mut client_options = ClientOptions::parse(&uri).await?;
    // Fail queries after 5s when MongoDB is unreachable (the driver default is
    // 30s), so requests answer 500 promptly. Same value in every server.
    client_options.server_selection_timeout = Some(std::time::Duration::from_secs(5));
    Ok(Client::with_options(client_options)?)
}

/// The first English text in `entries`, if any.
fn english<T>(
    entries: impl IntoIterator<Item = T>,
    language: impl Fn(&T) -> &str,
    text: impl Fn(T) -> String,
) -> Option<String> {
    entries.into_iter().find(|e| language(e) == "en").map(text)
}

/// Turns the PokeAPI responses for one Pokémon into what the Pokébox stores
/// and serves. `varieties` are the species' other forms, in any order; they
/// come out in the species' order.
pub fn to_pokebox_entry(
    main: FetchedPokemon,
    species: PokemonSpecies,
    varieties: Vec<FetchedPokemon>,
) -> PokeboxEntry {
    let species_text = english(
        species.flavor_text_entries,
        |e| e.language.name.as_str(),
        |e| e.flavor_text,
    )
    .unwrap_or_else(|| "No description available".to_string());

    let order: Vec<(String, bool)> = species
        .varieties
        .into_iter()
        .map(|v| (v.pokemon.name, v.is_default))
        .collect();
    let mut varieties: Vec<PokemonVariety> = varieties
        .into_iter()
        .map(|v| {
            let is_default = order
                .iter()
                .find(|(name, _)| *name == v.pokemon.name)
                .map_or(v.pokemon.is_default, |(_, d)| *d);
            let form = to_form(v, &species_text);
            PokemonVariety {
                name: form.name,
                id: form.id,
                form_name: form.form_name,
                is_default,
                species_description: form.description,
                types: form.types,
                abilities: form.abilities,
                sprites: form.sprites,
            }
        })
        .collect();
    varieties.sort_by_key(|v| order.iter().position(|(name, _)| *name == v.name));

    let form = to_form(main, &species_text);
    PokeboxEntry {
        id: form.id,
        name: form.name,
        form_name: form.form_name,
        species_description: form.description,
        types: form.types,
        abilities: form.abilities,
        sprites: form.sprites,
        varieties,
    }
}

/// What an entry and a variety have in common.
struct Form {
    id: i64,
    name: String,
    form_name: String,
    description: String,
    types: Vec<String>,
    abilities: Vec<PokemonAbility>,
    sprites: serde_json::Value,
}

/// `fetched` mapped, describing it with its form's own English flavour text,
/// or `species_text` when the form has none.
fn to_form(fetched: FetchedPokemon, species_text: &str) -> Form {
    let FetchedPokemon { pokemon, sprites, abilities, form } = fetched;
    let form_name = english(form.form_names, |n| n.language.name.as_str(), |n| n.name)
        .unwrap_or_default();
    let description = english(
        form.flavor_text_entries,
        |e| e.language.name.as_str(),
        |e| e.flavor_text,
    )
    .unwrap_or_else(|| species_text.to_string());

    let abilities = abilities
        .into_iter()
        .map(|ab| PokemonAbility {
            flavour_text: english(
                ab.flavor_text_entries,
                |e| e.language.name.as_str(),
                |e| e.flavor_text,
            )
            .unwrap_or_else(|| "No description available".to_string()),
            effect: english(
                ab.effect_entries,
                |e| e.language.name.as_str(),
                |e| e.short_effect,
            )
            .unwrap_or_else(|| "No effect available".to_string()),
            name: ab.name,
        })
        .collect();

    Form {
        id: pokemon.id,
        name: pokemon.name,
        form_name,
        description,
        types: pokemon.types.into_iter().map(|tp| tp.type_.name).collect(),
        abilities,
        sprites,
    }
}

fn extract_sprites_from_pokeapi_response(
    response: &serde_json::Value,
) -> std::result::Result<serde_json::Value, Box<dyn std::error::Error>> {
    response
        .get("sprites")
        .cloned()
        .ok_or_else(|| "sprites field missing from response".into())
}

#[test]
fn test_pokebox_entry_json_roundtrip() {
    let sprites: serde_json::Value = serde_json::from_str(include_str!("bulbasaur_sprites.json"))
        .expect("Failed to deserialize bulbasaur sprites");
    let entry = PokeboxEntry {
        name: "bulbasaur".into(),
        id: 1,
        form_name: "".into(),
        species_description: "Seed Pokemon".into(),
        types: vec!["grass".into(), "poison".into()],
        abilities: vec![],
        sprites: sprites.clone(),
        varieties: vec![],
    };

    let json = serde_json::to_string(&entry).expect("Failed to serialize entry");
    let decoded: PokeboxEntry = serde_json::from_str(&json).expect("Failed to deserialize entry");

    assert_eq!(decoded.id, 1);
    assert_eq!(decoded.name, "bulbasaur");
    assert_eq!(decoded.sprites, sprites);
}

#[test]
fn test_extract_sprites_from_pokeapi_response_preserves_extra_fields() {
    let response = serde_json::json!({
        "sprites": {
            "front_default": "https://example.com/front.png",
            "showdown": {
                "front_default": "https://example.com/showdown-front.gif"
            },
            "other": {
                "home": {
                    "front_shiny": "https://example.com/home-shiny.png"
                }
            }
        }
    });

    let sprites = extract_sprites_from_pokeapi_response(&response)
        .expect("Failed to extract sprites");

    assert_eq!(sprites["front_default"], "https://example.com/front.png");
    assert_eq!(sprites["showdown"]["front_default"], "https://example.com/showdown-front.gif");
    assert_eq!(sprites["other"]["home"]["front_shiny"], "https://example.com/home-shiny.png");
}

#[test]
fn test_extract_sprites_from_pokeapi_response_errors_when_missing_sprites() {
    let response = serde_json::json!({ "name": "vulpix" });
    let err = extract_sprites_from_pokeapi_response(&response).unwrap_err();
    assert!(err.to_string().contains("sprites field missing"));
}
