use rust_server::MockDb;
use rust_server::PokeboxDb;
use rust_server::{index, random_new};
use std::sync::Arc;
use rocket::local::asynchronous::Client;
use rocket::routes;
use rocket::http::Status;

#[tokio::test]
async fn test_index_route() {
    let db: Arc<dyn PokeboxDb + Send + Sync> = Arc::new(MockDb);

    let rocket = rocket::build()
        .manage(db)
        .mount("/", routes![index])
        .ignite()
        .await
        .unwrap();

    let client = Client::tracked(rocket).await.unwrap();

    let response = client.get("/").dispatch().await;
    assert_eq!(response.status(), Status::Ok);

    let body = response.into_string().await.unwrap();
    assert_eq!(body, "Hello, World!");
}

#[tokio::test]
async fn test_random_new_pokemon_route() {
    let db: Arc<dyn PokeboxDb + Send + Sync> = Arc::new(MockDb);

    let rocket = rocket::build()
        .manage(db)
        .mount("/", routes![random_new])
        .ignite()
        .await
        .unwrap();

    let client = Client::tracked(rocket).await.unwrap();

    let response = client.get("/pokemon/random-new").dispatch().await;
    assert_eq!(response.status(), Status::Ok);

    let body = response.into_string().await.unwrap();
    assert!(body.contains("name"));
    assert!(body.contains("id"));
}