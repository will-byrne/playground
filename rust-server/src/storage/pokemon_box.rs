use futures::TryStreamExt;
use rustemon::model::moves::Move;
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies, PokemonSprites, PokemonType};
use mongodb::{bson::doc, Client, Collection, options::ClientOptions};
use mongodb::error::Result;
use rocket::serde::{ Deserialize, Serialize};
use rocket::serde::json::serde_json;

#[async_trait::async_trait]
pub trait PokeboxDb {
    async fn get_pokedex(&self) -> Vec<PokedexEntry>;
    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxEntry;
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
        get_pokemon_by_id(&self.client, id).await
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
            PokedexEntry { id: 1, name: "bulbasaur".into() },
            PokedexEntry { id: 2, name: "ivysaur".into() },
        ]
    }

    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxEntry {
        PokeboxEntry {
            id,
            name: format!("pokemon{}", id),
            species_description: "Mock description".into(),
            types: vec!["grass".into()],
            abilities: vec![],
            sprites: serde_json::from_str(include_str!("bulbasaur_sprites.json")).unwrap(),
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
    description: String
}

#[derive(Serialize, Deserialize)]
pub struct PokemonAbility {
    name: String,
    flavour_text: String,
    effect: String
}

#[derive(Serialize, Deserialize)]
pub struct PokeboxEntry {
    name: String,
    id: i64,
    species_description: String,
    types: Vec<String>,
    abilities: Vec<PokemonAbility>,
    sprites: PokemonSprites
}

pub async fn create_db() -> Client {
    let uri = std::env::var("MONGODB_URI").unwrap_or_else(|_| "mongodb://admin:testtest@localhost:27017".to_string());
    println!("connecting to mongo at: {}", uri);
    let client_options = ClientOptions::parse(&uri)
        .await.unwrap();
    Client::with_options(client_options).unwrap()
}

pub async fn store_pokemon(mongodb: &Client, new_pokemon: &PokeboxEntry) -> Result<bool> {
    let pokemon_collection: Collection<PokeboxEntry> = mongodb
        .database("pokemon")
        .collection("pokemon");
    let result = pokemon_collection
        .insert_one(new_pokemon)
        .await;
    match result {
        Ok(_) => Ok(true),
        Err(e) => return Err(e)
    }
}

pub async fn get_pokemon_by_id(mongodb: &Client, id: i64) -> PokeboxEntry {
    let pokebox: Collection<PokeboxEntry> = mongodb
        .database("pokemon")
        .collection("pokemon");
    let filter = doc! {"id": id};
    let pokemon = pokebox
        .find_one(filter)
        .projection( doc! {
            "_id": 0
        }).await.unwrap();
    match pokemon {
        Some(pokemon) => pokemon,
        None => {
            let rustemon_client = rustemon::client::RustemonClient::default();
            let new_pokemon = rustemon::pokemon::pokemon::get_by_id(id, &rustemon_client).await.unwrap();
            let mut abilities: Vec<Ability> = vec![];
            for ab in new_pokemon.abilities.iter() {
                let ability: Ability = rustemon::pokemon::ability::get_by_name(ab.ability.name.as_str(), &rustemon_client).await.unwrap();
                abilities.push(ability);
            }
            let species = rustemon::pokemon::pokemon_species::get_by_name(&new_pokemon.species.name, &rustemon_client).await.unwrap();
            fn ability_mapper(ab: Ability) -> PokemonAbility {
                PokemonAbility { name: ab.name, flavour_text: ab.flavor_text_entries.into_iter().find(|entry| entry.language.name == "en").unwrap().flavor_text, effect: ab.effect_entries.into_iter().find(|entry| entry.language.name == "en").unwrap().short_effect }
            }
            fn type_mapper(tp: PokemonType) -> String {
                tp.type_.name
            }
            let pokebox_entry: PokeboxEntry = PokeboxEntry {
                id: new_pokemon.id,
                name: new_pokemon.name,
                species_description: species.flavor_text_entries.into_iter().find(|entry| entry.language.name == "en").unwrap().flavor_text,
                types: new_pokemon.types.into_iter().map(type_mapper).collect(),
                abilities: abilities.into_iter().map(ability_mapper).collect(),
                sprites: new_pokemon.sprites,
            };

            let _ = store_pokemon(mongodb, &pokebox_entry).await;
            pokebox_entry
        }
    }
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
    let sprites: PokemonSprites = serde_json::from_str(include_str!("bulbasaur_sprites.json")).unwrap();
    let entry = PokeboxEntry {
        name: "bulbasaur".into(),
        id: 1,
        species_description: "Seed Pokemon".into(),
        types: vec!["grass".into(), "poison".into()],
        abilities: vec![],
        sprites,
    };

    let json = serde_json::to_string(&entry).unwrap();
    let decoded: PokeboxEntry = serde_json::from_str(&json).unwrap();

    assert_eq!(decoded.id, 1);
    assert_eq!(decoded.name, "bulbasaur");
}
