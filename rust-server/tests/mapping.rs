//! `to_pokebox_entry` against real PokeAPI responses for bulbasaur and both
//! Vulpix forms, saved in tests/fixtures (move lists trimmed, since they
//! aren't used).

use rust_server::{FetchedPokemon, FormText, PokemonAbility, to_pokebox_entry};
use rustemon::model::pokemon::{Ability, Pokemon, PokemonSpecies};
use serde_json::Value;

fn fixture(name: &str) -> Value {
    let path = format!("{}/tests/fixtures/{name}.json", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"));
    serde_json::from_str(&text).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn parse<T: serde::de::DeserializeOwned>(value: Value) -> T {
    serde_json::from_value(value).expect("fixture matches the model")
}

/// Drops every English entry from `value[field]`.
fn without_english(mut value: Value, field: &str) -> Value {
    value[field]
        .as_array_mut()
        .unwrap()
        .retain(|entry| entry["language"]["name"] != "en");
    value
}

/// The raw PokeAPI responses for one `pokemon` resource.
struct Raw {
    pokemon: Value,
    abilities: Vec<Value>,
    form: Value,
}

impl Raw {
    /// `pokemon-<id>`, its abilities and `pokemon-form-<form>`.
    fn load(id: i64, form: &str) -> Raw {
        let pokemon = fixture(&format!("pokemon-{id}"));
        let abilities = pokemon["abilities"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| fixture(&format!("ability-{}", a["ability"]["name"].as_str().unwrap())))
            .collect();
        Raw { pokemon, abilities, form: fixture(&format!("pokemon-form-{form}")) }
    }

    fn fetched(self) -> FetchedPokemon {
        FetchedPokemon {
            sprites: self.pokemon["sprites"].clone(),
            pokemon: parse::<Pokemon>(self.pokemon),
            abilities: self.abilities.into_iter().map(parse::<Ability>).collect(),
            form: parse::<FormText>(self.form),
        }
    }
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
        let raw = Raw { pokemon: self.pokemon, abilities: self.abilities, form: fixture("pokemon-form-bulbasaur") };
        to_pokebox_entry(raw.fetched(), parse::<PokemonSpecies>(self.species), vec![])
    }
}

fn vulpix() -> Raw {
    Raw::load(37, "vulpix")
}

fn alolan_vulpix() -> Raw {
    Raw::load(10103, "vulpix-alola")
}

fn vulpix_species() -> PokemonSpecies {
    parse(fixture("pokemon-species-37"))
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

// --- forms and varieties ------------------------------------------------------

#[test]
fn a_species_with_one_form_has_no_varieties_or_form_name() {
    let entry = bulbasaur().map();
    assert!(entry.varieties.is_empty());
    assert_eq!(entry.form_name, "");
}

#[test]
fn the_default_form_carries_its_alternate_forms_in_full() {
    let entry = to_pokebox_entry(vulpix().fetched(), vulpix_species(), vec![alolan_vulpix().fetched()]);
    assert_eq!(entry.name, "vulpix");
    assert_eq!(entry.types, vec!["fire"]);
    assert_eq!(entry.varieties.len(), 1);

    let alola = &entry.varieties[0];
    assert_eq!(alola.name, "vulpix-alola");
    assert_eq!(alola.id, 10103);
    assert!(!alola.is_default);
    assert_eq!(alola.form_name, "Alolan Form");
    assert_eq!(alola.types, vec!["ice"]);
    let abilities: Vec<_> = alola.abilities.iter().map(|a| a.name.as_str()).collect();
    assert_eq!(abilities, vec!["snow-cloak", "snow-warning"]);
    assert!(alola.sprites["front_default"].is_string());
}

#[test]
fn a_form_with_its_own_flavour_text_uses_it() {
    let entry = to_pokebox_entry(vulpix().fetched(), vulpix_species(), vec![alolan_vulpix().fetched()]);
    assert!(
        entry.varieties[0].species_description.starts_with("It exhales air colder than"),
        "{}",
        entry.varieties[0].species_description
    );
    // The default form has no text of its own, so it keeps the species'.
    assert!(entry.species_description.starts_with("At the time of"), "{}", entry.species_description);
}

#[test]
fn a_form_without_its_own_flavour_text_falls_back_to_the_species() {
    let mut alola = alolan_vulpix();
    alola.form = without_english(alola.form, "flavor_text_entries");
    let entry = to_pokebox_entry(alola.fetched(), vulpix_species(), vec![]);
    assert!(entry.species_description.starts_with("At the time of"));
}

#[test]
fn an_alternate_form_lists_the_default_form() {
    let entry = to_pokebox_entry(alolan_vulpix().fetched(), vulpix_species(), vec![vulpix().fetched()]);
    assert_eq!(entry.id, 10103);
    assert_eq!(entry.form_name, "Alolan Form");
    assert_eq!(entry.varieties.len(), 1);
    assert_eq!(entry.varieties[0].name, "vulpix");
    assert!(entry.varieties[0].is_default);
    assert_eq!(entry.varieties[0].form_name, "");
}

#[test]
fn a_form_is_described_the_same_directly_or_as_a_variety() {
    let direct = to_pokebox_entry(alolan_vulpix().fetched(), vulpix_species(), vec![]);
    let nested = to_pokebox_entry(vulpix().fetched(), vulpix_species(), vec![alolan_vulpix().fetched()]);
    let variety = &nested.varieties[0];
    assert_eq!(variety.species_description, direct.species_description);
    assert_eq!(variety.form_name, direct.form_name);
    assert_eq!(variety.types, direct.types);
    assert_eq!(variety.abilities, direct.abilities);
    assert_eq!(variety.sprites, direct.sprites);
}
