//! Route tests against the real app (`build_rocket`), with an in-memory
//! Pokébox standing in for MongoDB and PokeAPI.

use rocket::http::{Header, Status};
use rocket::local::asynchronous::Client;
use rust_server::{
    MAX_POKEMON_ID, PokeboxDb, PokeboxEntry, PokeboxError, PokeboxResult, PokedexEntry,
    SharedDb, build_rocket,
};
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// In-memory Pokébox. Stored Pokémon are served as-is; any other id in the
/// dex range (or a known name) is "fetched" and then stored, like the real
/// one. `failure` makes every call fail, to test error handling.
#[derive(Default)]
struct FakeDb {
    stored: Mutex<Vec<PokeboxEntry>>,
    failure: Option<PokeboxError>,
}

const KNOWN_NAMES: &[(&str, i64)] = &[("bulbasaur", 1), ("ivysaur", 2), ("pikachu", 25)];

fn entry(id: i64) -> PokeboxEntry {
    let name = KNOWN_NAMES
        .iter()
        .find(|(_, known)| *known == id)
        .map(|(name, _)| name.to_string())
        .unwrap_or_else(|| format!("pokemon-{id}"));
    PokeboxEntry {
        name,
        id,
        species_description: "A test Pokémon.".into(),
        types: vec!["grass".into(), "poison".into()],
        abilities: vec![],
        sprites: json!({ "front_default": format!("https://example.com/{id}.png") }),
    }
}

impl FakeDb {
    fn with_stored(ids: impl IntoIterator<Item = i64>) -> Self {
        FakeDb {
            stored: Mutex::new(ids.into_iter().map(entry).collect()),
            failure: None,
        }
    }

    fn failing(err: PokeboxError) -> Self {
        FakeDb {
            failure: Some(err),
            ..Default::default()
        }
    }

    fn check(&self) -> PokeboxResult<()> {
        self.failure.clone().map_or(Ok(()), Err)
    }

    fn lookup(&self, matches: impl Fn(&PokeboxEntry) -> bool, fetch: Option<i64>) -> PokeboxResult<PokeboxEntry> {
        self.check()?;
        let mut stored = self.stored.lock().unwrap();
        if let Some(found) = stored.iter().find(|e| matches(e)) {
            return Ok(found.clone());
        }
        let id = fetch.ok_or(PokeboxError::NotFound)?;
        let fetched = entry(id);
        stored.push(fetched.clone());
        Ok(fetched)
    }
}

#[async_trait::async_trait]
impl PokeboxDb for FakeDb {
    async fn get_pokedex(&self) -> PokeboxResult<Vec<PokedexEntry>> {
        self.check()?;
        Ok(self
            .stored
            .lock()
            .unwrap()
            .iter()
            .map(|e| PokedexEntry { name: e.name.clone(), id: e.id })
            .collect())
    }

    async fn get_pokemon_by_id(&self, id: i64) -> PokeboxResult<PokeboxEntry> {
        let in_dex = (1..=MAX_POKEMON_ID).contains(&id).then_some(id);
        self.lookup(|e| e.id == id, in_dex)
    }

    async fn get_pokemon_by_name(&self, name: &str) -> PokeboxResult<PokeboxEntry> {
        let known = KNOWN_NAMES.iter().find(|(n, _)| *n == name).map(|(_, id)| *id);
        self.lookup(|e| e.name == name, known)
    }

    async fn store_pokemon(&self, pokemon: &PokeboxEntry) -> PokeboxResult<()> {
        self.check()?;
        self.stored.lock().unwrap().push(pokemon.clone());
        Ok(())
    }
}

async fn client(db: FakeDb) -> Client {
    let db: SharedDb = Arc::new(db);
    Client::tracked(build_rocket(db)).await.expect("valid rocket")
}

async fn get_json(client: &Client, path: &str) -> (Status, Option<Value>) {
    let response = client.get(path).dispatch().await;
    let status = response.status();
    let body = response.into_string().await.and_then(|b| serde_json::from_str(&b).ok());
    (status, body)
}

// --- index ----------------------------------------------------------------

#[tokio::test]
async fn index_says_hello() {
    let client = client(FakeDb::default()).await;
    let response = client.get("/").dispatch().await;
    assert_eq!(response.status(), Status::Ok);
    assert_eq!(response.into_string().await.unwrap(), "Hello, World!");
}

// --- /pokedex -------------------------------------------------------------

#[tokio::test]
async fn pokedex_lists_stored_pokemon() {
    let client = client(FakeDb::with_stored([1, 2])).await;
    let (status, body) = get_json(&client, "/pokedex").await;
    assert_eq!(status, Status::Ok);
    assert_eq!(
        body.unwrap(),
        json!([{ "name": "bulbasaur", "id": 1 }, { "name": "ivysaur", "id": 2 }])
    );
}

#[tokio::test]
async fn pokedex_is_empty_when_nothing_is_stored() {
    let client = client(FakeDb::default()).await;
    let (status, body) = get_json(&client, "/pokedex").await;
    assert_eq!(status, Status::Ok);
    assert_eq!(body.unwrap(), json!([]));
}

#[tokio::test]
async fn pokedex_reports_a_db_failure_instead_of_an_empty_list() {
    let client = client(FakeDb::failing(PokeboxError::Db("down".into()))).await;
    let (status, _) = get_json(&client, "/pokedex").await;
    assert_eq!(status, Status::InternalServerError);
}

// --- /pokemon/<id_or_name> -----------------------------------------------

#[tokio::test]
async fn pokemon_by_id_returns_the_full_entry() {
    let client = client(FakeDb::default()).await;
    let (status, body) = get_json(&client, "/pokemon/25").await;
    assert_eq!(status, Status::Ok);
    assert_eq!(
        body.unwrap(),
        json!({
            "name": "pikachu",
            "id": 25,
            "species_description": "A test Pokémon.",
            "types": ["grass", "poison"],
            "abilities": [],
            "sprites": { "front_default": "https://example.com/25.png" }
        })
    );
}

#[tokio::test]
async fn pokemon_by_name_looks_up_by_name() {
    let client = client(FakeDb::default()).await;
    let (status, body) = get_json(&client, "/pokemon/pikachu").await;
    assert_eq!(status, Status::Ok);
    let body = body.unwrap();
    assert_eq!(body["id"], 25);
    assert_eq!(body["name"], "pikachu");
}

#[tokio::test]
async fn pokemon_lookup_stores_the_fetched_pokemon() {
    let client = client(FakeDb::default()).await;
    get_json(&client, "/pokemon/25").await;
    let (_, body) = get_json(&client, "/pokedex").await;
    assert_eq!(body.unwrap(), json!([{ "name": "pikachu", "id": 25 }]));
}

#[tokio::test]
async fn unknown_pokemon_are_not_found() {
    let client = client(FakeDb::default()).await;
    for path in ["/pokemon/0", "/pokemon/-1", "/pokemon/99999", "/pokemon/missingno"] {
        let (status, _) = get_json(&client, path).await;
        assert_eq!(status, Status::NotFound, "{path}");
    }
}

#[tokio::test]
async fn pokeapi_failures_are_bad_gateway_not_not_found() {
    let client = client(FakeDb::failing(PokeboxError::Upstream("timed out".into()))).await;
    for path in ["/pokemon/1", "/pokemon/bulbasaur"] {
        let (status, _) = get_json(&client, path).await;
        assert_eq!(status, Status::BadGateway, "{path}");
    }
}

#[tokio::test]
async fn names_that_cant_exist_are_not_found_without_a_lookup() {
    // Every lookup against this store fails with 502, so a 404 proves the
    // route answered without asking the store (and so PokeAPI).
    let client = client(FakeDb::failing(PokeboxError::Upstream("unreachable".into()))).await;
    for path in ["/pokemon/%C2%84", "/pokemon/%13", "/pokemon/a%20b", "/pokemon/1.5", "/pokemon/%2E%2E"] {
        let (status, _) = get_json(&client, path).await;
        assert_eq!(status, Status::NotFound, "{path}");
    }
}

#[tokio::test]
async fn names_are_case_insensitive() {
    let client = client(FakeDb::default()).await;
    let (status, body) = get_json(&client, "/pokemon/Pikachu").await;
    assert_eq!(status, Status::Ok);
    assert_eq!(body.unwrap()["id"], 25);
}

#[tokio::test]
async fn db_failures_are_internal_errors_not_not_found() {
    let client = client(FakeDb::failing(PokeboxError::Db("down".into()))).await;
    let (status, _) = get_json(&client, "/pokemon/1").await;
    assert_eq!(status, Status::InternalServerError);
}

// --- /pokemon/random-new -------------------------------------------------

#[tokio::test]
async fn random_new_returns_a_pokemon_not_yet_stored() {
    // Everything but 700 is stored, so 700 is the only valid answer.
    let client = client(FakeDb::with_stored((1..=MAX_POKEMON_ID).filter(|&id| id != 700))).await;
    let (status, body) = get_json(&client, "/pokemon/random-new").await;
    assert_eq!(status, Status::Ok);
    assert_eq!(body.unwrap()["id"], 700);
}

#[tokio::test]
async fn random_new_stores_what_it_returns() {
    let client = client(FakeDb::default()).await;
    let (_, body) = get_json(&client, "/pokemon/random-new").await;
    let id = body.unwrap()["id"].clone();
    let (_, pokedex) = get_json(&client, "/pokedex").await;
    assert_eq!(pokedex.unwrap()[0]["id"], id);
}

// This used to spin forever in a synchronous loop. A tokio timeout can't
// interrupt that (and the runtime would then hang on shutdown), so the
// request runs on a detached thread with its own runtime: a regression fails
// here after the timeout instead of hanging the test run.
#[test]
fn random_new_is_not_found_once_all_are_stored() {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let status = runtime.block_on(async {
            let client = client(FakeDb::with_stored(1..=MAX_POKEMON_ID)).await;
            get_json(&client, "/pokemon/random-new").await.0
        });
        let _ = tx.send(status);
    });
    let status = rx
        .recv_timeout(Duration::from_secs(10))
        .expect("random-new should not hang when everything is caught");
    assert_eq!(status, Status::NotFound);
}

#[tokio::test]
async fn random_new_reports_a_db_failure() {
    let client = client(FakeDb::failing(PokeboxError::Db("down".into()))).await;
    let (status, _) = get_json(&client, "/pokemon/random-new").await;
    assert_eq!(status, Status::InternalServerError);
}

// --- CORS -----------------------------------------------------------------

#[tokio::test]
async fn responses_allow_any_origin() {
    let client = client(FakeDb::with_stored([1])).await;
    for path in ["/", "/pokedex", "/pokemon/1", "/pokemon/missingno"] {
        let response = client.get(path).dispatch().await;
        assert_eq!(
            response.headers().get_one("Access-Control-Allow-Origin"),
            Some("*"),
            "{path}"
        );
    }
}

#[tokio::test]
async fn preflight_requests_succeed() {
    let client = client(FakeDb::default()).await;
    let response = client
        .options("/pokemon/1")
        .header(Header::new("Origin", "http://localhost:4004"))
        .header(Header::new("Access-Control-Request-Method", "GET"))
        .dispatch()
        .await;
    assert_eq!(response.status(), Status::NoContent);
    assert_eq!(response.headers().get_one("Access-Control-Allow-Origin"), Some("*"));
    assert!(
        response
            .headers()
            .get_one("Access-Control-Allow-Methods")
            .unwrap()
            .contains("GET")
    );
}
