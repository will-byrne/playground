use futures::TryStreamExt;
use mongodb::error::Result;
use mongodb::{Client, Collection, bson::doc, options::ClientOptions};
use rocket::serde::json::serde_json;
use rocket::serde::{Deserialize, Serialize};
use rustemon::model::moves::Move;
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies, PokemonType};

#[async_trait::async_trait]
pub trait PokeboxDb {
    async fn get_pokedex(&self) -> Vec<PokedexEntry>;
    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxEntry;
    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxEntry;
    async fn store_pokemon(&self, pokemon: &PokeboxEntry) -> bool;
}

pub struct MongoDb {
    pub client: mongodb::Client,
}

#[async_trait::async_trait]
impl PokeboxDb for MongoDb {
    async fn get_pokedex(&self) -> Vec<PokedexEntry> {
        get_pokedex(&self.client).await
    }

    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxEntry {
        match get_pokemon_by_id(&self.client, id).await {
            Ok(pokemon) => pokemon,
            Err(e) => {
                eprintln!("Failed to get pokemon {}: {}", id, e);
                // Create a default PokemonSprites by parsing empty JSON
                let default_sprites = serde_json::json!({
                    "back_default": null,
                    "back_female": null,
                    "back_shiny": null,
                    "back_shiny_female": null,
                    "front_default": null,
                    "front_female": null,
                    "front_shiny": null,
                    "front_shiny_female": null
                });
                PokeboxEntry {
                    id,
                    name: format!("pokemon{}", id),
                    species_description: "Error loading pokemon".to_string(),
                    types: vec![],
                    abilities: vec![],
                    sprites: serde_json::from_value(default_sprites).unwrap_or_else(|_| {
                        serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                            .expect("Failed to parse bulbasaur sprites")
                    }),
                }
            }
        }
    }

    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxEntry {
        match get_pokemon_by_name(&self.client, name).await {
            Ok(pokemon) => pokemon,
            Err(e) => {
                eprintln!("Failed to get pokemon {}: {}", name, e);
                // Create a default PokemonSprites by parsing empty JSON
                let default_sprites = serde_json::json!({
                    "back_default": null,
                    "back_female": null,
                    "back_shiny": null,
                    "back_shiny_female": null,
                    "front_default": null,
                    "front_female": null,
                    "front_shiny": null,
                    "front_shiny_female": null
                });
                PokeboxEntry {
                    id: 0,
                    name: name.to_string(),
                    species_description: "Error loading pokemon".to_string(),
                    types: vec![],
                    abilities: vec![],
                    sprites: serde_json::from_value(default_sprites).unwrap_or_else(|_| {
                        serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                            .expect("Failed to parse bulbasaur sprites")
                    }),
                }
            }
        }
    }


    async fn store_pokemon(&self, pokemon: &PokeboxEntry) -> bool {
        store_pokemon(&self.client, pokemon).await.unwrap_or(false)
    }
}

pub struct MockDb;

#[async_trait::async_trait]
impl PokeboxDb for MockDb {
    async fn get_pokedex(&self) -> Vec<PokedexEntry> {
        vec![
            PokedexEntry {
                id: 1,
                name: "bulbasaur".into(),
            },
            PokedexEntry {
                id: 2,
                name: "ivysaur".into(),
            },
        ]
    }

    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxEntry {
        let default_sprites = serde_json::json!({
            "back_default": null,
            "back_female": null,
            "back_shiny": null,
            "back_shiny_female": null,
            "front_default": null,
            "front_female": null,
            "front_shiny": null,
            "front_shiny_female": null
        });
        PokeboxEntry {
            id,
            name: format!("pokemon{}", id),
            species_description: "Mock description".into(),
            types: vec!["grass".into()],
            abilities: vec![],
            sprites: serde_json::from_value(default_sprites).unwrap_or_else(|_| {
                serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                    .expect("Failed to parse bulbasaur sprites")
            }),
        }
    }

    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxEntry {
        let default_sprites = serde_json::json!({
            "back_default": null,
            "back_female": null,
            "back_shiny": null,
            "back_shiny_female": null,
            "front_default": null,
            "front_female": null,
            "front_shiny": null,
            "front_shiny_female": null
        });
        PokeboxEntry {
            id: 42,
            name: name.to_string(),
            species_description: "Mock description".into(),
            types: vec!["grass".into()],
            abilities: vec![],
            sprites: serde_json::from_value(default_sprites).unwrap_or_else(|_| {
                serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                    .expect("Failed to parse bulbasaur sprites")
            }),
        }
    }

    async fn store_pokemon(&self, _pokemon: &PokeboxEntry) -> bool {
        true
    }
}

#[derive(Serialize, Deserialize)]
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

#[derive(Serialize, Deserialize)]
pub struct PokemonAbility {
    name: String,
    flavour_text: String,
    effect: String,
}

#[derive(Serialize, Deserialize)]
pub struct PokeboxEntry {
    name: String,
    id: i64,
    species_description: String,
    types: Vec<String>,
    abilities: Vec<PokemonAbility>,
    sprites: serde_json::Value,
}

pub async fn create_db() -> std::result::Result<Client, Box<dyn std::error::Error>> {
    let uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://admin:testtest@localhost:27017".to_string());
    println!("connecting to mongo at: {}", uri);
    let client_options = ClientOptions::parse(&uri).await?;
    Ok(Client::with_options(client_options)?)
}

pub async fn store_pokemon(mongodb: &Client, new_pokemon: &PokeboxEntry) -> Result<bool> {
    let pokemon_collection: Collection<PokeboxEntry> =
        mongodb.database("pokemon").collection("pokemon");
    pokemon_collection.insert_one(new_pokemon).await?;
    Ok(true)
}

pub async fn get_pokemon_by_id(
    mongodb: &Client,
    id: i64,
) -> std::result::Result<PokeboxEntry, Box<dyn std::error::Error>> {
    let pokebox: Collection<PokeboxEntry> = mongodb.database("pokemon").collection("pokemon");
    let filter = doc! {"id": id};
    let pokemon = pokebox
        .find_one(filter)
        .projection(doc! { "_id": 0 })
        .await?;

    if let Some(pokemon) = pokemon {
        return Ok(pokemon);
    }

    let rustemon_client = rustemon::client::RustemonClient::default();
    let new_pokemon = rustemon::pokemon::pokemon::get_by_id(id, &rustemon_client)
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    let mut abilities: Vec<Ability> = vec![];

    for ab in new_pokemon.abilities.iter() {
        if let Ok(ability) =
            rustemon::pokemon::ability::get_by_name(ab.ability.name.as_str(), &rustemon_client)
                .await
        {
            abilities.push(ability);
        }
    }

    let species = rustemon::pokemon::pokemon_species::get_by_name(
        &new_pokemon.species.name,
        &rustemon_client,
    )
    .await
    .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

    fn ability_mapper(ab: Ability) -> PokemonAbility {
        let flavour_text = ab
            .flavor_text_entries
            .into_iter()
            .find(|entry| entry.language.name == "en")
            .map(|entry| entry.flavor_text)
            .unwrap_or_else(|| "No description available".to_string());

        let effect = ab
            .effect_entries
            .into_iter()
            .find(|entry| entry.language.name == "en")
            .map(|entry| entry.short_effect)
            .unwrap_or_else(|| "No effect available".to_string());

        PokemonAbility {
            name: ab.name,
            flavour_text,
            effect,
        }
    }

    fn type_mapper(tp: PokemonType) -> String {
        tp.type_.name
    }

    let species_description = species
        .flavor_text_entries
        .into_iter()
        .find(|entry| entry.language.name == "en")
        .map(|entry| entry.flavor_text)
        .unwrap_or_else(|| "No description available".to_string());

    let sprites = fetch_pokemon_sprites_by_id(new_pokemon.id)
        .await
        .unwrap_or_else(|err| {
            eprintln!("Failed to fetch raw sprites for {}: {}", new_pokemon.id, err);
            serde_json::to_value(&new_pokemon.sprites)
                .unwrap_or_else(|_| {
                    serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                        .expect("Failed to parse bulbasaur sprites")
                })
        });

    let pokebox_entry = PokeboxEntry {
        id: new_pokemon.id,
        name: new_pokemon.name,
        species_description,
        types: new_pokemon.types.into_iter().map(type_mapper).collect(),
        abilities: abilities.into_iter().map(ability_mapper).collect(),
        sprites,
    };

    let _ = store_pokemon(mongodb, &pokebox_entry).await;
    Ok(pokebox_entry)
}

pub async fn get_pokemon_by_name(
    mongodb: &Client,
    name: &str,
) -> std::result::Result<PokeboxEntry, Box<dyn std::error::Error>> {
    let pokebox: Collection<PokeboxEntry> = mongodb.database("pokemon").collection("pokemon");
    let filter = doc! {"name": name};
    let pokemon = pokebox
        .find_one(filter)
        .projection(doc! { "_id": 0 })
        .await?;

    if let Some(pokemon) = pokemon {
        return Ok(pokemon);
    }

    let rustemon_client = rustemon::client::RustemonClient::default();
    let new_pokemon = rustemon::pokemon::pokemon::get_by_name(name, &rustemon_client)
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    let mut abilities: Vec<Ability> = vec![];

    for ab in new_pokemon.abilities.iter() {
        if let Ok(ability) =
            rustemon::pokemon::ability::get_by_name(ab.ability.name.as_str(), &rustemon_client)
                .await
        {
            abilities.push(ability);
        }
    }

    let species = rustemon::pokemon::pokemon_species::get_by_name(
        &new_pokemon.species.name,
        &rustemon_client,
    )
    .await
    .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

    fn ability_mapper(ab: Ability) -> PokemonAbility {
        let flavour_text = ab
            .flavor_text_entries
            .into_iter()
            .find(|entry| entry.language.name == "en")
            .map(|entry| entry.flavor_text)
            .unwrap_or_else(|| "No description available".to_string());

        let effect = ab
            .effect_entries
            .into_iter()
            .find(|entry| entry.language.name == "en")
            .map(|entry| entry.short_effect)
            .unwrap_or_else(|| "No effect available".to_string());

        PokemonAbility {
            name: ab.name,
            flavour_text,
            effect,
        }
    }

    fn type_mapper(tp: PokemonType) -> String {
        tp.type_.name
    }

    let species_description = species
        .flavor_text_entries
        .into_iter()
        .find(|entry| entry.language.name == "en")
        .map(|entry| entry.flavor_text)
        .unwrap_or_else(|| "No description available".to_string());

    let sprites = fetch_pokemon_sprites_by_name(&new_pokemon.name)
        .await
        .unwrap_or_else(|err| {
            eprintln!("Failed to fetch raw sprites for {}: {}", new_pokemon.name, err);
            serde_json::to_value(&new_pokemon.sprites)
                .unwrap_or_else(|_| {
                    serde_json::from_str(include_str!("bulbasaur_sprites.json"))
                        .expect("Failed to parse bulbasaur sprites")
                })
        });

    let pokebox_entry = PokeboxEntry {
        id: new_pokemon.id,
        name: new_pokemon.name,
        species_description,
        types: new_pokemon.types.into_iter().map(type_mapper).collect(),
        abilities: abilities.into_iter().map(ability_mapper).collect(),
        sprites,
    };

    let _ = store_pokemon(mongodb, &pokebox_entry).await;
    Ok(pokebox_entry)
}

fn extract_sprites_from_pokeapi_response(
    response: &serde_json::Value,
) -> std::result::Result<serde_json::Value, Box<dyn std::error::Error>> {
    response
        .get("sprites")
        .cloned()
        .ok_or_else(|| format!("sprites field missing from response").into())
}

async fn fetch_pokemon_sprites(url: &str) -> std::result::Result<serde_json::Value, Box<dyn std::error::Error>> {
    let resp: serde_json::Value = reqwest::get(url).await?.json().await?;
    extract_sprites_from_pokeapi_response(&resp)
}

async fn fetch_pokemon_sprites_by_id(id: i64) -> std::result::Result<serde_json::Value, Box<dyn std::error::Error>> {
    fetch_pokemon_sprites(&format!("https://pokeapi.co/api/v2/pokemon/{}", id)).await
}

async fn fetch_pokemon_sprites_by_name(name: &str) -> std::result::Result<serde_json::Value, Box<dyn std::error::Error>> {
    fetch_pokemon_sprites(&format!("https://pokeapi.co/api/v2/pokemon/{}", name)).await
}

pub async fn get_pokedex(mongodb: &Client) -> Vec<PokedexEntry> {
    let pokedex = mongodb
        .database("pokemon")
        .collection::<Pokemon>("pokemon")
        .clone_with_type::<PokedexEntry>()
        .find(doc! {})
        .projection(doc! { "_id": 0, "id": 1, "name": 1 })
        .sort(doc! { "id": 1 })
        .await;

    if let Ok(r) = pokedex {
        if let Ok(collected) = r.try_collect::<Vec<PokedexEntry>>().await {
            return collected;
        }
    }

    vec![]
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
