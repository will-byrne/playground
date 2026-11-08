//! `to_pokebox_entry` against real PokeAPI responses for bulbasaur, saved in
//! tests/fixtures (the move list is trimmed, since it isn't used).

use rust_server::{PokemonAbility, to_pokebox_entry};
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies};
use serde_json::Value;

fn fixture(name: &str) -> Value {
    let path = format!("{}/tests/fixtures/{name}.json", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn parse<T: serde::de::DeserializeOwned>(value: Value) -> T {
    serde_json::from_value(value).expect("fixture matches the rustemon model")
}

/// Drops every English entry from `value[field]`.
fn without_english(mut value: Value, field: &str) -> Value {
    value[field]
        .as_array_mut()
        .unwrap()
        .retain(|entry| entry["language"]["name"] != "en");
    value
}

struct Bulbasaur {
    pokemon: Value,
    species: Value,
    abilities: Vec<Value>,
}

fn bulbasaur() -> Bulbasaur {
    Bulbasaur {
        pokemon: fixture("pokemon-1"),
        species: fixture("pokemon-species-1"),
        abilities: vec![fixture("ability-overgrow"), fixture("ability-chlorophyll")],
    }
}

impl Bulbasaur {
    fn map(self) -> rust_server::PokeboxEntry {
        let sprites = self.pokemon["sprites"].clone();
        to_pokebox_entry(
            parse::<Pokemon>(self.pokemon),
            parse::<PokemonSpecies>(self.species),
            self.abilities.into_iter().map(parse::<Ability>).collect(),
            sprites,
        )
    }
}

#[test]
fn maps_id_name_and_types_in_order() {
    let entry = bulbasaur().map();
    assert_eq!(entry.id, 1);
    assert_eq!(entry.name, "bulbasaur");
    assert_eq!(entry.types, vec!["grass", "poison"]);
}

#[test]
fn uses_the_first_english_species_description() {
    let entry = bulbasaur().map();
    // Raw PokeAPI text, line breaks and form feed included.
    assert_eq!(
        entry.species_description,
        "A strange seed was\nplanted on its\nback at birth.\u{c}The plant sprouts\nand grows with\nthis POKéMON."
    );
}

#[test]
fn maps_abilities_with_english_text_in_order() {
    let entry = bulbasaur().map();
    assert_eq!(entry.abilities.len(), 2);
    assert_eq!(
        entry.abilities[0],
        PokemonAbility {
            name: "overgrow".into(),
            flavour_text: "Ups GRASS moves in a pinch.".into(),
            effect: "Strengthens Grass moves to inflict 1.5× damage at 1/3 max HP or less.".into(),
        }
    );
    assert_eq!(entry.abilities[1].name, "chlorophyll");
}

#[test]
fn keeps_the_raw_sprites_untouched() {
    let raw = fixture("pokemon-1")["sprites"].clone();
    let entry = bulbasaur().map();
    assert_eq!(entry.sprites, raw);
    // The nested sprite sets rustemon's model doesn't fully cover.
    assert!(entry.sprites["other"]["official-artwork"]["front_default"].is_string());
}

#[test]
fn falls_back_when_there_is_no_english_species_text() {
    let mut mon = bulbasaur();
    mon.species = without_english(mon.species, "flavor_text_entries");
    assert_eq!(mon.map().species_description, "No description available");
}

#[test]
fn falls_back_when_an_ability_has_no_english_text() {
    let mut mon = bulbasaur();
    let overgrow = mon.abilities.remove(0);
    let overgrow = without_english(without_english(overgrow, "flavor_text_entries"), "effect_entries");
    mon.abilities.insert(0, overgrow);

    let entry = mon.map();
    assert_eq!(entry.abilities[0].flavour_text, "No description available");
    assert_eq!(entry.abilities[0].effect, "No effect available");
    // The other ability is unaffected.
    assert_eq!(entry.abilities[1].name, "chlorophyll");
    assert_ne!(entry.abilities[1].effect, "No effect available");
}

#[test]
fn abilities_that_failed_to_fetch_are_simply_absent() {
    let mut mon = bulbasaur();
    mon.abilities.truncate(1);
    let names: Vec<_> = mon.map().abilities.into_iter().map(|a| a.name).collect();
    assert_eq!(names, vec!["overgrow"]);
}
