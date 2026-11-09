import { type Ability, MainClient } from "pokenode-ts";
import { type FetchedPokemon, type FormText, toPokeboxEntry } from "./mapping";
import { PokeboxEntry, type PokedexEntry } from "./model";
import { AppDataSource } from "./data-source";
import { PokeboxError, fromDb, fromPokeApi } from "./errors";

const api = new MainClient();

const getPokemonRepository = () => {
  return AppDataSource.getMongoRepository(PokeboxEntry);
};

const stripMongoMetadata = (entry: PokeboxEntry): Omit<PokeboxEntry, "_id"> => {
  const rest: Partial<PokeboxEntry> = { ...entry };
  delete rest._id;
  return rest as Omit<PokeboxEntry, "_id">;
};

// Matches rust-server's `id_or_name.parse::<i64>()`: an optionally signed integer is an id,
// anything else is a name.
const isId = (idOrName: string) => /^[+-]?\d+$/.test(idOrName);

/**
 * One `pokemon` resource with its abilities and form text. A 404 for the
 * Pokémon is `not_found`; a missing form just means no form text.
 */
const fetchPokemon = async (idOrName: string): Promise<FetchedPokemon> => {
  const pokemon = await fromPokeApi(
    `pokemon ${idOrName}`,
    () =>
      isId(idOrName)
        ? api.pokemon.getPokemonById(Number(idOrName))
        : api.pokemon.getPokemonByName(idOrName),
    { notFoundMeansMissing: true },
  );

  const formName = pokemon.forms[0]?.name;
  const [abilityResults, form] = await Promise.all([
    // Like rust-server, abilities that fail to load are skipped rather than failing the request.
    Promise.allSettled(
      pokemon.abilities.map(({ ability }) => api.pokemon.getAbilityByName(ability.name)),
    ),
    formName
      ? fromPokeApi(
          `form ${formName}`,
          () => api.pokemon.getPokemonFormByName(formName) as Promise<FormText>,
          { notFoundMeansMissing: true },
        ).catch((error) => {
          if (error instanceof PokeboxError && error.kind === "not_found") return {};
          throw error;
        })
      : {},
  ]);
  const abilities: Ability[] = abilityResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  return { pokemon, abilities, form };
};

const fetchFromPokeApi = async (idOrName: string) => {
  const main = await fetchPokemon(idOrName);
  const species = await fromPokeApi(`species ${main.pokemon.species.name}`, () =>
    api.pokemon.getPokemonSpeciesByName(main.pokemon.species.name),
  );

  // A variety PokeAPI doesn't have is skipped; any other failure fails the
  // lookup, so an entry missing forms is never stored.
  const varieties = await Promise.all(
    species.varieties
      .map((v) => v.pokemon.name)
      .filter((name) => name !== main.pokemon.name)
      .map((name) =>
        fetchPokemon(name).catch((error) => {
          if (error instanceof PokeboxError && error.kind === "not_found") {
            console.error(`Variety ${name} not found, skipping it`);
            return null;
          }
          throw error;
        }),
      ),
  );

  return toPokeboxEntry(
    main,
    species,
    varieties.filter((v): v is FetchedPokemon => v !== null),
  );
};

export const getPokemon = async (idOrName: string): Promise<Omit<PokeboxEntry, "_id">> => {
  const repository = getPokemonRepository();
  // Entries stored before varieties existed don't match, so they're refetched
  // and replaced.
  const pokeboxEntry = await fromDb(`find ${idOrName}`, () =>
    repository.findOneBy({
      ...(isId(idOrName) ? { id: Number(idOrName) } : { name: idOrName }),
      varieties: { $exists: true },
    }),
  );

  if (pokeboxEntry) {
    return stripMongoMetadata(pokeboxEntry);
  }

  console.log(`Pokemon not found in database, fetching from API: ${idOrName}`);
  const newPokeboxEntry = repository.create(await fetchFromPokeApi(idOrName));

  try {
    // Upsert by id, so storing the same Pokémon twice keeps one copy.
    await repository.replaceOne(
      { id: newPokeboxEntry.id },
      stripMongoMetadata(newPokeboxEntry),
      { upsert: true },
    );
  } catch (error) {
    console.error(`Failed to store pokemon ${newPokeboxEntry.name}`, error);
  }
  return stripMongoMetadata(newPokeboxEntry);
};

export const getPokedex = async (): Promise<PokedexEntry[]> => {
  const entries = await fromDb("get_pokedex", () =>
    getPokemonRepository()
      .createCursor({ id: { $exists: true } })
      .project({ _id: 0, id: 1, name: 1 })
      .sort({ id: 1 })
      .toArray(),
  );
  return entries.map(({ id, name }) => ({ name, id }));
};
