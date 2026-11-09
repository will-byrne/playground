// rustemon's deeply nested models overflow the default limit when checking
// that the PokeAPI fetch futures are Send.
#![recursion_limit = "256"]

#[macro_use]
extern crate rocket;
pub mod storage;

use crate::storage::pokemon_box::MongoDb;
use rand::seq::IndexedRandom;
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::{Header, Status};
use rocket::{Build, Rocket};
use rocket::{Request, Response};
use rocket::{State, serde::json::Json};
use std::collections::HashSet;
use std::sync::Arc;
pub use storage::pokemon_box::{
    FetchedPokemon, FormText, PokeboxDb, PokeboxEntry, PokeboxError, PokeboxResult, PokedexEntry,
    PokemonAbility, PokemonVariety, to_pokebox_entry,
};

/// The Pokébox store the routes share.
pub type SharedDb = Arc<dyn PokeboxDb>;

/// Highest national dex number `/pokemon/random-new` picks from.
pub const MAX_POKEMON_ID: i64 = 1025;

impl From<PokeboxError> for Status {
    fn from(err: PokeboxError) -> Self {
        match err {
            PokeboxError::NotFound => Status::NotFound,
            PokeboxError::Upstream(_) => {
                eprintln!("{err}");
                Status::BadGateway
            }
            PokeboxError::Db(_) => {
                eprintln!("{err}");
                Status::InternalServerError
            }
        }
    }
}

/// A random id in 1..=MAX_POKEMON_ID that isn't in `caught`, or None once
/// every Pokémon has been caught.
pub fn pick_uncaught_id(caught: &[i64]) -> Option<i64> {
    let caught: HashSet<i64> = caught.iter().copied().collect();
    let uncaught: Vec<i64> = (1..=MAX_POKEMON_ID)
        .filter(|id| !caught.contains(id))
        .collect();
    uncaught.choose(&mut rand::rng()).copied()
}

#[options("/<_..>")]
fn all_options() -> Status {
    Status::NoContent
}

#[get("/")]
pub fn index() -> &'static str {
    "Hello, World!"
}

/// A Pokémon that isn't in the Pokébox yet, which this then stores. 404 once
/// all of them are stored.
#[get("/pokemon/random-new")]
pub async fn random_new(db: &State<SharedDb>) -> Result<Json<PokeboxEntry>, Status> {
    let caught: Vec<i64> = db.get_pokedex().await?.into_iter().map(|e| e.id).collect();
    let id = pick_uncaught_id(&caught).ok_or(Status::NotFound)?;
    Ok(Json(db.get_pokemon_by_id(id).await?))
}

/// Longest id or name `/pokemon/<id_or_name>` accepts. Real names top out
/// around 25 characters.
pub const MAX_IDENTIFIER_LEN: usize = 64;

/// `id_or_name` lowercased, if it can name a Pokémon: 1 to
/// MAX_IDENTIFIER_LEN of a-z, 0-9 and `-`. Anything else can't exist, so it's
/// answered 404 without asking PokeAPI (which rejects odd names with a 403
/// that would otherwise surface as a 502).
pub fn normalize_identifier(id_or_name: &str) -> Option<String> {
    let key = id_or_name.trim().to_lowercase();
    let valid = !key.is_empty()
        && key.len() <= MAX_IDENTIFIER_LEN
        && key
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
    valid.then_some(key)
}

#[get("/pokemon/<id_or_name>")]
pub async fn specific_pokemon(
    db: &State<SharedDb>,
    id_or_name: &str,
) -> Result<Json<PokeboxEntry>, Status> {
    let key = normalize_identifier(id_or_name).ok_or(Status::NotFound)?;
    let pokemon = match key.parse::<i64>() {
        Ok(id) => db.get_pokemon_by_id(id).await?,
        Err(_) => db.get_pokemon_by_name(&key).await?,
    };
    Ok(Json(pokemon))
}

#[get("/pokedex")]
pub async fn pokedex(db: &State<SharedDb>) -> Result<Json<Vec<PokedexEntry>>, Status> {
    Ok(Json(db.get_pokedex().await?))
}

pub struct CORS;
#[rocket::async_trait]
impl Fairing for CORS {
    fn info(&self) -> Info {
        Info {
            name: "Add CORS headers to responses",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new(
            "Access-Control-Allow-Origin",
            "*", // or "*" if you want to allow any origin
        ));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, PATCH, GET, DELETE, OPTIONS",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

/// The full app (routes and CORS) over any Pokébox store. Tests use this with
/// a fake store so they exercise exactly what production serves.
pub fn build_rocket(db: SharedDb) -> Rocket<Build> {
    rocket::build().attach(CORS).manage(db).mount(
        "/",
        routes![index, pokedex, random_new, specific_pokemon, all_options],
    )
}

pub async fn rocket_app() -> Result<Rocket<Build>, Box<dyn std::error::Error>> {
    let client = storage::pokemon_box::create_db().await?;
    let db: SharedDb = Arc::new(MongoDb::new(client).await);
    Ok(build_rocket(db))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pick_uncaught_id_never_returns_a_caught_id() {
        let caught = vec![1, 2, 3, 1000];
        for _ in 0..500 {
            let id = pick_uncaught_id(&caught).expect("plenty left to catch");
            assert!((1..=MAX_POKEMON_ID).contains(&id));
            assert!(!caught.contains(&id));
        }
    }

    #[test]
    fn pick_uncaught_id_finds_the_last_one_left() {
        let caught: Vec<i64> = (1..=MAX_POKEMON_ID).filter(|&id| id != 777).collect();
        assert_eq!(pick_uncaught_id(&caught), Some(777));
    }

    #[test]
    fn pick_uncaught_id_is_none_when_all_are_caught() {
        let caught: Vec<i64> = (1..=MAX_POKEMON_ID).collect();
        assert_eq!(pick_uncaught_id(&caught), None);
    }

    #[test]
    fn pick_uncaught_id_ignores_ids_outside_the_range() {
        // Alternate forms have ids above 10000; they don't use up a dex slot.
        let mut caught: Vec<i64> = (2..=MAX_POKEMON_ID).collect();
        caught.push(10001);
        assert_eq!(pick_uncaught_id(&caught), Some(1));
    }

    #[test]
    fn normalize_identifier_accepts_ids_and_names_case_insensitively() {
        assert_eq!(normalize_identifier("25").as_deref(), Some("25"));
        assert_eq!(normalize_identifier("pikachu").as_deref(), Some("pikachu"));
        assert_eq!(normalize_identifier(" Mr-Mime ").as_deref(), Some("mr-mime"));
        assert_eq!(normalize_identifier("-1").as_deref(), Some("-1"));
    }

    #[test]
    fn normalize_identifier_rejects_what_cant_name_a_pokemon() {
        let too_long = "a".repeat(MAX_IDENTIFIER_LEN + 1);
        for bad in ["", " ", "..", "a b", "1.5", "+5", "\u{84}", "\u{13}", "pokémon", &too_long] {
            assert_eq!(normalize_identifier(bad), None, "{bad:?} should be rejected");
        }
    }

    #[test]
    fn errors_map_to_distinct_statuses() {
        assert_eq!(Status::from(PokeboxError::NotFound), Status::NotFound);
        assert_eq!(Status::from(PokeboxError::Upstream("x".into())), Status::BadGateway);
        assert_eq!(Status::from(PokeboxError::Db("x".into())), Status::InternalServerError);
    }
}
