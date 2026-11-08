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
    pub species_description: String,
    pub types: Vec<String>,
    pub abilities: Vec<PokemonAbility>,
    pub sprites: serde_json::Value,
}

/// How a Pokémon was asked for.
enum PokemonKey<'a> {
    Id(i64),
    Name(&'a str),
}

impl PokemonKey<'_> {
    fn filter(&self) -> Document {
        match self {
            PokemonKey::Id(id) => doc! { "id": id },
            PokemonKey::Name(name) => doc! { "name": name },
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

    async fn fetch_from_pokeapi(&self, key: &PokemonKey<'_>) -> PokeboxResult<PokeboxEntry> {
        // Fetched directly rather than through rustemon: rustemon doesn't
        // expose the status code (so a 404 can't be told from an outage), and
        // its model drops sprite fields the clients use.
        let response = self
            .http
            .get(format!("{}/pokemon/{key}", self.api_base))
            .send()
            .await
            .map_err(upstream)?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(PokeboxError::NotFound);
        }
        let raw: serde_json::Value = response
            .error_for_status()
            .map_err(upstream)?
            .json()
            .await
            .map_err(upstream)?;
        let pokemon = Pokemon::deserialize(&raw).map_err(upstream)?;
        let sprites = extract_sprites_from_pokeapi_response(&raw)
            .unwrap_or_else(|_| serde_json::to_value(&pokemon.sprites).unwrap_or_default());

        let mut abilities = Vec::new();
        for ability_ref in pokemon.abilities.iter().filter_map(|ab| ab.ability.as_ref()) {
            match rustemon::pokemon::ability::get_by_name(&ability_ref.name, &self.rustemon).await {
                Ok(ability) => abilities.push(ability),
                Err(err) => eprintln!("Failed to fetch ability {}: {err}", ability_ref.name),
            }
        }

        let species =
            rustemon::pokemon::pokemon_species::get_by_name(&pokemon.species.name, &self.rustemon)
                .await
                .map_err(upstream)?;

        Ok(to_pokebox_entry(pokemon, species, abilities, sprites))
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

/// Turns the PokeAPI responses for one Pokémon into what the Pokébox stores
/// and serves. `abilities` are the full ability resources, in the order the
/// Pokémon lists them; `sprites` is the raw `sprites` object.
pub fn to_pokebox_entry(
    pokemon: Pokemon,
    species: PokemonSpecies,
    abilities: Vec<Ability>,
    sprites: serde_json::Value,
) -> PokeboxEntry {
    let species_description = species
        .flavor_text_entries
        .into_iter()
        .find(|entry| entry.language.name == "en")
        .map(|entry| entry.flavor_text)
        .unwrap_or_else(|| "No description available".to_string());

    let abilities = abilities
        .into_iter()
        .map(|ab| PokemonAbility {
            flavour_text: ab
                .flavor_text_entries
                .into_iter()
                .find(|entry| entry.language.name == "en")
                .map(|entry| entry.flavor_text)
                .unwrap_or_else(|| "No description available".to_string()),
            effect: ab
                .effect_entries
                .into_iter()
                .find(|entry| entry.language.name == "en")
                .map(|entry| entry.short_effect)
                .unwrap_or_else(|| "No effect available".to_string()),
            name: ab.name,
        })
        .collect();

    PokeboxEntry {
        id: pokemon.id,
        name: pokemon.name,
        species_description,
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
        species_description: "Seed Pokemon".into(),
        types: vec!["grass".into(), "poison".into()],
        abilities: vec![],
        sprites: sprites.clone(),
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
