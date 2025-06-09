use futures::TryStreamExt;
use rustemon::model::moves::Move;
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies, PokemonSprites, PokemonType};
use mongodb::{bson::doc, Client, Collection};
use mongodb::error::Result;
use rocket::serde::{ Deserialize, Serialize};

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
