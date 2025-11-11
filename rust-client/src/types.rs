use serde::Deserialize;
use rustemon::model::pokemon::PokemonSprites;

#[derive(Debug, Deserialize, Clone)]
pub struct Ability {
    pub name: String,
    pub flavour_text: String,
    pub effect: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PokeboxEntry {
    pub id: u32,
    pub name: String,
    pub species_description: String,
    pub types: Vec<String>,
    pub abilities: Vec<Ability>,
    pub sprites: PokemonSprites,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PokedexEntry {
    pub id: u32,
    pub name: String,
}
