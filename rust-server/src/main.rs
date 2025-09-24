#[macro_use] extern crate rocket;

mod storage;

use rocket::{serde::json::Json, State};
use storage::pokemon_box::{get_pokedex, get_pokemon_by_id, PokeboxEntry, PokedexEntry};
use mongodb::options::ClientOptions;
use mongodb::Client;
use rand::Rng;

async fn create_db() -> Client {
    let client_options = ClientOptions::parse("mongodb://admin:testtest@localhost:27017").await.unwrap();
    let client = Client::with_options(client_options).unwrap();
    client
}

fn generate_random_no_with_exclude(excludes: &Vec<i64>) -> i64 {
    let mut rand: i64 = 0;
    let mut rng = rand::rng();

    while rand == 0 || excludes.contains(&rand) {
        rand = rng.random_range(1..1025);
    }
    rand
}

#[options("/<_..>")]
fn all_options() -> Status {
    Status::NoContent
}

#[get("/")]
fn index() -> &'static str {
    "Hello, World!"
}

#[get("/pokemon/random-new")]
async fn random_new(db: &State<Client>) -> Json<PokeboxEntry> {
    fn mapper(dex_entry: PokedexEntry) -> i64 {
        dex_entry.id
    }
    let used_ids: Vec<i64> = get_pokedex(db).await.into_iter().map(mapper).collect();
    let random_new_id = generate_random_no_with_exclude(&used_ids);
    let pokemon_deets = get_pokemon_by_id(db, random_new_id).await;

    Json(pokemon_deets)
}

#[get("/pokemon/<id>")]
async fn specific_pokemon(db: &State<Client>, id: i64) -> Json<PokeboxEntry>  {
    let pokemon_deets = get_pokemon_by_id(db, id).await;

    Json(pokemon_deets)
}

#[get("/pokedex")]
async fn pokedex(db: &State<Client>) -> Json<Vec<PokedexEntry>> {
    let pokedex = get_pokedex(db).await;

    Json(pokedex)
}

use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::{Header, Status};
use rocket::{Request, Response};

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

#[launch]
async fn rocket() -> _ {
    let client = create_db().await;

    rocket::build()
        .configure(rocket::Config::figment().merge(("port", 3000)))
        .attach(CORS)
        .manage(client)
        .mount("/", routes![index, pokedex, random_new, specific_pokemon, all_options])
}
