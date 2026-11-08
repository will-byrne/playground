# Playground
My playground for testing and or learning various libraries and code techniques.

## What is this repo for?
I made this repo with the idea of having a shared contract between client and server and testing out a variety of languages and frameworks.
I got the idea when I encountered `hono` which I had not used before and was already playing with a rust server so thought this would be a good way to proceed.

## Why Pokémon?
Nostalgia mostly but also its a free open API that has a good data structure and a good amount of helper libraries.
This allows me to code in a way I would for production code. I am not writing a tool to contact AWS directly, instead I would use the provided toolkit for the language.
Pokémon is also completely non work related and light-hearted, this means no one will confuse it for prod code when it is not meant to be.

## Clients
A quick note about the clients: they do not share a UX, I will undoubtedly port some components or snippets of code across to re-use and save time but some will be too different to easily recreate.
This will mean that I wont be able to have one suite of e2e tests that can run on any client but it is something that I intend to test when I have everything up to date with the current contract.

## AI Use
This repo is about testing new technologies and that includes AI. I am largely not that interested in the raw `html` and `css` except where is is substantially different from what I am used to. This means that I will probably use some AI tools to automagically generate the UX in some places. I will also be using AI to generate tests, as a testing specialist I am interested to see how well AI can handle that task, from what I have seen so far its not good but I will give it a fair run and try in a few of the sub-projects.

## Storage
I am starting with `MongoDB` but will potentially add other storage systems in the future.
I could do it all in memory but in the docs of `Pokeapi` they do request that people cache locally when possible to prevent overtaxing of their servers, fair enough.
The plan is that any of the servers can start up and write and pull data from the same MongoDB store which will for now just be run in `docker`.

## Contract
The contract between client and server has been pretty much nailed down now.
Are all of the clients and servers up to date? ...no. Will they be? Yes, absolutely, I want this to be a living repo that will almost always build and run with any combination of client and server.
I have preferences and biases that's for sure, I really enjoy working with the `react-client` and `rust-server` more than others so they will most likely be the most up to date ones.

The contract is written down in [`contract/openapi.yaml`](contract/openapi.yaml) (`rust-server` is the reference implementation):

| Route | Returns |
| --- | --- |
| `GET /` | `Hello, World!` (plain text) |
| `GET /pokemon/{idOrName}` | one Pokémon by dex number or name, fetched from PokeAPI and stored if new |
| `GET /pokemon/random-new` | a random Pokémon not stored yet, which it then stores |
| `GET /pokedex` | every stored Pokémon as `{ id, name }`, sorted by id |

Errors are status codes only: `404` not found, `502` PokeAPI failed, `500` database failed. Every response allows any origin (CORS) and `OPTIONS` answers `204`.

`contract/` also holds a test suite that checks any running server against the spec:
- `cd contract && BASE_URL=http://localhost:3002 bun test` checks one server.
- `cd contract && bun run matrix` checks every server on ports 3000-3004 and prints a pass/fail table.
- With Nix: `BASE_URL=http://localhost:3002 nix run .#contract` (one server) or `nix build .#contract && ./result/bin/contract-matrix` (all of them).
- CI (`.github/workflows/contract.yml`) runs it against each server on every push and PR.

## Infrastructure?
Short answer yes. The long answer is that I would like to get to the point where I can load all of the clients and servers in `docker compose` and have a switch of some sort to select which server to use from the clients.
Eventually I would like to have a similar setup using something like `minikube` to help me get better at `kubernetes` and another setup so it can all be run from a `nix` flake. When I eventually get a machine to use as a server I will experiment with automatic deployments, probably using `nix` at first.

### Running with Nix
The root `flake.nix` runs the same stack as `docker-compose.yaml` without docker: every server and client is built with Nix and run under `process-compose`, on the same ports (servers 3000-3004, clients 4001-4007, MongoDB 27017).
- `nix run` starts everything, `nix run . -- up rust-server react-client` starts just those (plus MongoDB).
- `nix build .#<name>` builds a single project, e.g. `nix build .#go-server`.
- MongoDB data lives in `./.data` (override with `PLAYGROUND_DATA_DIR`).
- When a lockfile changes, set that project's hash in `nix/packages.nix` to `lib.fakeHash`, build, and paste in the hash Nix reports.

## Future Frameworks and Languages
I am toying with the idea of the following clients:
- `Electron` wrapped around either `react-client` or `remix-client`.
And the following servers:
- Java
- C#
- Python

If you have read this far and have any suggestions for frameworks and technologies I should try raise an issue and ill take a look.
If you like the idea of this repo and want to do one yourself go for it, I have found it extremely useful. Feel free to also fork this repo and push back any tech you want to add.
The shape of the client / server contract is in the Contract section above.

## TODO
- [ ] Pencil client
- [ ] Pyhton server
- [ ] Setup proper linting for each project
- [ ] Finish go-server
- [ ] Hapi server
- [ ] TypeORM
- [ ] RxJS
- [x] Finish svelte-client
- [x] update all servers to use current contract (clients still to check)
- [x] document current contract here in this readme
- [ ] add e2e tests for some of the clients
- [ ] start looking into infrastructure
