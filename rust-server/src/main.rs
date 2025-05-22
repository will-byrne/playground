#[macro_use] extern crate rocket;

#[get("/")]
fn index() -> &'static str {
    "Hello, World!"
}

#[get("/pokemon/random-new")]
fn index() -> &'static str {
    "Hello, World!"
}

#[get("/pokemon/:id")]
fn index() -> &'static str {
    "Hello, World!"
}

#[get("/pokedex")]
fn index() -> &'static str {
    "Hello, World!"
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![index])
}
