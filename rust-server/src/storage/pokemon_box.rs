use futures::TryStreamExt;
use rustemon::model::moves::Move;
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies};
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

pub async fn store_pokemon(mongodb: &Client, new_pokemon: Pokemon) -> Result<bool> {
    let pokemon_collection: Collection<Pokemon> = mongodb
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

pub async fn get_pokemon_by_id(mongodb: &Client, id: i64) -> PokemonDeets {
    let pokemon_collection: Collection<Pokemon> = mongodb
        .database("pokemon")
        .collection("pokemon");
    let filter = doc! {"id": id};
    let pokemon = pokemon_collection
        .find_one(filter)
        .projection( doc! {
            "_id": 0
        }).await.unwrap();
    let ability_collection: Collection<Ability> = mongodb
        .database("pokemon")
        .collection("abilities");
    let moves_collection: Collection<Move> = mongodb
        .database("pokemon")
        .collection("moves");
    let species_collection: Collection<PokemonSpecies> = mongodb
        .database("pokemon")
        .collection("species");
    match pokemon {
        Some(pokemon) => {
            let species: PokemonSpecies = species_collection.find_one(doc! { "name": pokemon.species.name.clone() }).await.unwrap().unwrap();
            let mut abilities: Vec<Ability> = vec![];
            for ab in pokemon.abilities.iter() {
                let ability = ability_collection.find_one(doc! { "name": ab.ability.name.clone() }).await.unwrap().unwrap();
                abilities.push(ability);
            }
            let mut moves: Vec<Move> = vec![];
            for mv in pokemon.moves.iter() {
                let new_move = moves_collection.find_one(doc! { "name": mv.move_.name.clone() }).await.unwrap().unwrap();
                moves.push(new_move);
            }

            PokemonDeets {
                pokemon: pokemon,
                abilities: abilities,
                moves: moves,
                species: species
            }

        },
        None => {
            let rustemon_client = rustemon::client::RustemonClient::default();
            let new_pokemon = rustemon::pokemon::pokemon::get_by_id(id, &rustemon_client).await.unwrap();
            let _ = store_pokemon(mongodb, new_pokemon.clone()).await.unwrap();
            let mut abilities: Vec<Ability> = vec![];
            for ab in new_pokemon.abilities.iter() {
                let ability: Ability = rustemon::pokemon::ability::get_by_name(ab.ability.name.as_str(), &rustemon_client).await.unwrap();
                let _ = ability_collection.replace_one(doc! { "name": ability.name.clone() }, &ability).upsert(true).await;
                abilities.push(ability);
            }
            let mut moves: Vec<Move> = vec![];
            for mv in new_pokemon.moves.iter() {
                let new_mv: Move = rustemon::moves::move_::get_by_name(mv.move_.name.as_str(), &rustemon_client).await.unwrap();
                let _ = moves_collection.replace_one(doc! { "name": new_mv.name.clone() }, &new_mv).upsert(true).await;
                moves.push(new_mv);
            }
            let species = rustemon::pokemon::pokemon_species::get_by_name(&new_pokemon.species.name, &rustemon_client).await.unwrap();
            let _ = species_collection.replace_one(doc! { "name": species.name.clone() }, &species).upsert(true).await;
            
            PokemonDeets {
                pokemon: new_pokemon,
                abilities: abilities,
                moves: moves,
                species: species,
            }
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
