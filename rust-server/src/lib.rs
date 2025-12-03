#[macro_use] extern crate rocket;
pub mod storage;

use std::sync::Arc;
pub use storage::pokemon_box::{PokeboxDb, MockDb, PokeboxEntry, PokedexEntry};
use rocket::{Rocket, Build};
use rocket::{serde::json::Json, State};
use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::{Header, Status};
use rocket::{Request, Response};
use rand::Rng;
use crate::storage::pokemon_box::MongoDb;

fn generate_random_no_with_exclude(excludes: &Vec<i64>) -> i64 {
    let mut rand: i64 = 0;
    let mut rng = rand::rng();

    while rand == 0 || excludes.contains(&rand) {
        rand = rng.random_range(1..=1025);
    }
    rand
}

#[options("/<_..>")]
fn all_options() -> Status {
    Status::NoContent
}

#[get("/")]
pub fn index() -> &'static str {
    "Hello, World!"
}

#[get("/pokemon/random-new")]
pub async fn random_new(db: &State<Arc<dyn PokeboxDb + Send + Sync>>) -> Json<PokeboxEntry> {
    fn mapper(dex_entry: PokedexEntry) -> i64 {
        dex_entry.id
    }
    let used_ids: Vec<i64> = db.inner().get_pokedex().await.into_iter().map(mapper).collect();
    let random_new_id = generate_random_no_with_exclude(&used_ids);
    let pokemon_deets = db.inner().get_pokemon_by_id(random_new_id).await;

    Json(pokemon_deets)
}

#[get("/pokemon/<id>")]
async fn specific_pokemon(db: &State<Arc<dyn PokeboxDb + Send + Sync>>, id: i64) -> Json<PokeboxEntry>  {
    let pokemon_deets = db.inner().get_pokemon_by_id(id).await;

    Json(pokemon_deets)
}

#[get("/pokedex")]
async fn pokedex(db: &State<Arc<dyn PokeboxDb + Send + Sync>>) -> Json<Vec<PokedexEntry>> {
    let pokedex = db.inner().get_pokedex().await;

    Json(pokedex)
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
        response.set_header(Header::new(
            "Access-Control-Allow-Headers",
            "*",
        ));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

pub async fn rocket_app() -> Rocket<Build> {
  let client = storage::pokemon_box::create_db().await;

  let db: Arc<dyn PokeboxDb + Send + Sync> = Arc::new(MongoDb { client });
  rocket::build()
    .configure(rocket::Config::figment().merge(("port", 3000)))
    .attach(CORS)
    .manage(db)
    .mount("/", routes![index, pokedex, random_new, specific_pokemon, all_options])
}

#[test]
fn test_generate_random_no_with_exclude() {
    let excludes = vec![1, 2, 3, 1000];

    for _ in 0..500 {
        let v = generate_random_no_with_exclude(&excludes);
        assert!(v >= 1 && v <= 1025);
        assert!(!excludes.contains(&v));
    }
}
