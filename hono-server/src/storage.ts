import { type Ability, MainClient, type Pokemon } from 'pokenode-ts';
import { MongoClient } from 'mongodb';
import { PokeboxError, fromDb, fromPokeApi } from './errors';
import { type FetchedPokemon, type FormText, type MappedEntry, toPokeboxEntry } from './mapping';

const api = new MainClient();
// Fail queries after 5s when MongoDB is unreachable, so the request answers
// 500. The driver's 30s default outlasts Bun's 10s HTTP idle timeout, so the
// client would get a dropped connection instead. Same value in every server.
const mongoClient = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://admin:testtest@localhost:27017', {
  serverSelectionTimeoutMS: 5000,
});
const mongoDB = mongoClient.db('pokemon');
const pokemonCollection = mongoDB.collection<PokeboxEntry>('pokemon');

// rust-server's unique index on id, so concurrent first lookups of the same
// Pokémon can't store it twice. Failing to create it (MongoDB not up yet, or
// duplicates already stored) is logged, not fatal; upserts still keep new
// writes from duplicating.
pokemonCollection.createIndex({ id: 1 }, { unique: true }).catch((error) => {
  console.warn(`WARNING: could not create the unique index on pokemon.id (${error}). If duplicates are already stored, remove them and restart.`);
});

/** What the Pokébox stores and serves; see mapping.ts. */
export type PokeboxEntry = MappedEntry;

export type PokedexEntry = { name: string, id: number };

const isNotFound = (error: unknown) => error instanceof PokeboxError && error.kind === 'not_found';

/** The abilities and form text that go with one `pokemon` resource. */
const fetchExtras = async (pokemon: Pokemon): Promise<FetchedPokemon> => {
  const formName = pokemon.forms[0]?.name;
  const [abilityResults, form] = await Promise.all([
    // Like rust-server, abilities that fail to load are skipped rather than failing the request.
    Promise.allSettled(pokemon.abilities.map(({ ability }) => api.pokemon.getAbilityByName(ability.name))),
    // A missing form just means no form text.
    formName
      ? fromPokeApi(`form ${formName}`, () => api.pokemon.getPokemonFormByName(formName) as Promise<FormText>, {
          notFoundMeansMissing: true,
        }).catch((error): FormText => {
          if (isNotFound(error)) return {};
          throw error;
        })
      : {},
  ]);
  const abilities: Ability[] = abilityResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  return { pokemon, abilities, form };
};

const buildPokeboxEntry = async (pokemon: Pokemon): Promise<PokeboxEntry> => {
  const [main, species] = await Promise.all([
    fetchExtras(pokemon),
    fromPokeApi(`species ${pokemon.species.name}`, () => api.pokemon.getPokemonSpeciesByName(pokemon.species.name)),
  ]);

  // A variety PokeAPI doesn't have is skipped; any other failure fails the
  // lookup, so an entry missing forms is never stored.
  const varieties = await Promise.all(
    species.varieties
      .map((v) => v.pokemon.name)
      .filter((name) => name !== pokemon.name)
      .map(async (name) => {
        try {
          const variety = await fromPokeApi(`pokemon ${name}`, () => api.pokemon.getPokemonByName(name), {
            notFoundMeansMissing: true,
          });
          return await fetchExtras(variety);
        } catch (error) {
          if (!isNotFound(error)) throw error;
          console.error(`Variety ${name} not found, skipping it`);
          return null;
        }
      }),
  );

  return toPokeboxEntry(main, species, varieties.filter((v): v is FetchedPokemon => v !== null));
};

const getPokemon = async (
  filter: { id: number } | { name: string },
  fetchFromApi: () => Promise<Pokemon>,
): Promise<PokeboxEntry> => {
  // Entries stored before varieties existed don't match, so they're refetched
  // and replaced.
  const cached = await fromDb(`find ${JSON.stringify(filter)}`, () =>
    pokemonCollection.findOne({ ...filter, varieties: { $exists: true } }, { projection: { _id: 0 } }),
  );
  if (cached) return cached;

  const pokemon = await fromPokeApi(`pokemon ${JSON.stringify(filter)}`, fetchFromApi, {
    notFoundMeansMissing: true,
  });
  const entry = await buildPokeboxEntry(pokemon);
  try {
    // Upsert by id, so storing the same Pokémon twice keeps one copy. A copy
    // is stored so the driver can't add `_id` to the returned entry.
    await pokemonCollection.replaceOne({ id: entry.id }, { ...entry }, { upsert: true });
  } catch (error) {
    console.error(`Failed to store Pokemon ${entry.name}: ${error}`);
  }
  return entry;
};

export const getPokemonById = (id: number): Promise<PokeboxEntry> =>
  getPokemon({ id }, () => api.pokemon.getPokemonById(id));

export const getPokemonByName = (name: string): Promise<PokeboxEntry> =>
  getPokemon({ name }, () => api.pokemon.getPokemonByName(name));

export const getPokedex = async (): Promise<PokedexEntry[]> => {
  const entries = await fromDb('get_pokedex', () =>
    pokemonCollection
      .find<PokedexEntry>({ id: { $exists: true } }, { projection: { _id: 0, id: 1, name: 1 } })
      .sort({ id: 1 })
      .toArray(),
  );
  return entries.map(({ name, id }) => ({ name, id }));
};
