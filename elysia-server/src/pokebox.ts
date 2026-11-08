import { type Ability, MainClient } from "pokenode-ts";
import { PokeboxEntry, type PokedexEntry } from "./model";
import { AppDataSource } from "./data-source";
import { fromDb, fromPokeApi } from "./errors";

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

const findEnglish = <T extends { language: { name: string } }>(entries: T[]) =>
  entries.find(({ language }) => language.name === "en");

export const getPokemon = async (idOrName: string): Promise<Omit<PokeboxEntry, "_id">> => {
  const repository = getPokemonRepository();
  const pokeboxEntry = await fromDb(`find ${idOrName}`, () =>
    isId(idOrName)
      ? repository.findOneBy({ id: Number(idOrName) })
      : repository.findOneBy({ name: idOrName }),
  );

  if (pokeboxEntry) {
    return stripMongoMetadata(pokeboxEntry);
  }

  console.log(`Pokemon not found in database, fetching from API: ${idOrName}`);
  const pokemon = await fromPokeApi(
    `pokemon ${idOrName}`,
    () =>
      isId(idOrName)
        ? api.pokemon.getPokemonById(Number(idOrName))
        : api.pokemon.getPokemonByName(idOrName),
    { notFoundMeansMissing: true },
  );

  // Like rust-server, abilities that fail to load are skipped rather than failing the request.
  const abilities: Ability[] = (
    await Promise.allSettled(
      pokemon.abilities.map(({ ability }) => api.pokemon.getAbilityByName(ability.name)),
    )
  ).flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  const species = await fromPokeApi(`species ${pokemon.species.name}`, () =>
    api.pokemon.getPokemonSpeciesByName(pokemon.species.name),
  );

  const newPokeboxEntry = repository.create({
    id: pokemon.id,
    name: pokemon.name,
    species_description:
      findEnglish(species.flavor_text_entries)?.flavor_text ?? "No description available",
    types: pokemon.types.map(({ type }) => type.name),
    sprites: pokemon.sprites,
    abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
      name,
      flavour_text: findEnglish(flavor_text_entries)?.flavor_text ?? "No description available",
      effect: findEnglish(effect_entries)?.short_effect ?? "No effect available",
    })),
  });

  try {
    await repository.save(newPokeboxEntry);
  } catch (error) {
    console.error(`Failed to store pokemon ${pokemon.name}`, error);
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
