# Rust Server
This is a rust server for my pokemon api playground work.
When a pokemon is requested, if it is in the database it will return the data so it can be rendered by whaterver client is being used.
If the pokemon is not in the database then it will request it from the [Pokeapi](https://pokeapi.co/) and store it in the db then return it to the client.
The server also has an endpoint to return a random non cached pokemon.
To know which pokemon are in the db the server provides a pokedex endpoint which provides the id and name.

## Stack
This server is written in rust using Rocket as the webserver and Rustemon as the client for the Pokeapi.

## Commands
To run the server simply run:
```bash
cargo run
```
and the dev version will run, it currently runs on a hardcoded port (3000) but this will be configurable in the future.

To build the server:
```bash
cargo build
```

To lint the code run:
```bash
cargo check
```

To run the tests:
```bash
cargo test
```

