// src/api.rs
use crate::types::{PokeboxEntry, PokedexEntry};
use reqwest::Error;

pub async fn fetch_pokemon(id: u32) -> Result<PokeboxEntry, Error> {
    let url = format!("http://localhost:3000/pokemon/{}", id);
    let resp = reqwest::get(url).await?.json::<PokeboxEntry>().await?;
    Ok(resp)
}

pub async fn fetch_pokedex() -> Result<Vec<PokedexEntry>, Error> {
    let url = "http://localhost:3000/pokedex";
    let resp = reqwest::get(url).await?.json::<Vec<PokedexEntry>>().await?;
    Ok(resp)
}
