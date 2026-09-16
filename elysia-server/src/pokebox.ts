import { type Ability, MainClient } from "pokenode-ts";
import { PokeboxEntry, type PokedexEntry } from "./model";
import { AppDataSource } from "./data-source";

const api = new MainClient();

const getPokemonRepository = () => {
  return AppDataSource.getRepository(PokeboxEntry);
};

const stripMongoMetadata = <T extends { _id?: unknown }>(entry: T): Omit<T, "_id"> => {
  const { ...rest } = entry;
  return rest as Omit<T, "_id">;
};

export const getPokemon = async (idOrName: string): Promise<Omit<PokeboxEntry, "_id">> => {
  console.log('idOrName: ', idOrName);
  const isName = Number.isNaN(Number(idOrName));
  const repository = getPokemonRepository();
  const pokeboxEntry = isName
    ? await repository.findOneBy({ name: idOrName })
    : await repository.findOneBy({ id: Number(idOrName) });

  if (pokeboxEntry) {
    console.log('Found pokemon in database: ', pokeboxEntry.name);
    return stripMongoMetadata(pokeboxEntry);
  }
  console.log(`Pokemon not found in database, fetching from API: ${idOrName}`);
  try {
    const pokemon = isName
      ? await api.pokemon.getPokemonByName(idOrName)
      : await api.pokemon.getPokemonById(Number(idOrName));

    const abilities: Ability[] = await Promise.all(
      pokemon.abilities.map(async ({ ability }) => {
        return await api.pokemon.getAbilityByName(ability.name);
      }),
    );

    const species = await api.pokemon.getPokemonSpeciesByName(pokemon.species.name);
    const species_description = species.flavor_text_entries.find(
      (entry) => entry.language.name === "en",
    )?.flavor_text;

    if (!species_description) {
      throw new Error("Unable to find species");
    }

    const newPokeboxEntry = repository.create({
      id: pokemon.id,
      name: pokemon.name,
      species_description,
      types: pokemon.types.map(({ type }) => type.name),
      sprites: pokemon.sprites,
      abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
        name,
        flavour_text:
          flavor_text_entries.find(({ language }) => language.name === "en")?.flavor_text || "",
        effect: effect_entries.find(({ language }) => language.name === "en")?.effect || "",
      })),
    });

    await repository.save(newPokeboxEntry);
    return stripMongoMetadata(newPokeboxEntry);
  } catch (error) {
    console.log(`Could not find pokemon with id or name: ${idOrName}`);
    throw error;
  }
};

export const getPokedex = async (): Promise<PokedexEntry[]> => {
  const repository = getPokemonRepository();
  return repository.find({
    select: {
      id: true,
      name: true,
    },
  });
};
