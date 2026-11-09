import type { Ability, Pokemon, PokemonSpecies, PokemonSprites } from "pokenode-ts";

type Localized = { language: { name: string } };

/**
 * The parts of a PokeAPI `pokemon-form` the Pokébox uses. pokenode-ts's
 * `PokemonForm` predates `flavor_text_entries`, so this is typed here.
 */
export type FormText = {
  form_names?: ({ name: string } & Localized)[];
  flavor_text_entries?: ({ flavor_text: string } & Localized)[];
};

/**
 * One PokeAPI `pokemon` resource and what it needs besides the species: its
 * abilities (in the order it lists them, minus any that failed to fetch) and
 * its first `pokemon-form`.
 */
export type FetchedPokemon = {
  pokemon: Pokemon;
  abilities: Ability[];
  form: FormText;
};

export type PokemonAbility = {
  name: string;
  flavour_text: string;
  effect: string;
};

/** Another form of the same species, complete so clients can switch to it. */
export type PokemonVariety = {
  id: number;
  name: string;
  form_name: string;
  is_default: boolean;
  species_description: string;
  types: string[];
  abilities: PokemonAbility[];
  sprites: PokemonSprites;
};

export type MappedEntry = Omit<PokemonVariety, "is_default"> & {
  varieties: PokemonVariety[];
};

const findEnglish = <T extends Localized>(entries: T[] = []) =>
  entries.find(({ language }) => language.name === "en");

/**
 * `fetched` mapped, described by its form's own English flavour text, or
 * `speciesText` when the form has none.
 */
const toForm = ({ pokemon, abilities, form }: FetchedPokemon, speciesText: string) => ({
  id: pokemon.id,
  name: pokemon.name,
  form_name: findEnglish(form.form_names)?.name ?? "",
  species_description: findEnglish(form.flavor_text_entries)?.flavor_text ?? speciesText,
  types: pokemon.types.map(({ type }) => type.name),
  abilities: abilities.map(({ name, flavor_text_entries, effect_entries }) => ({
    name,
    flavour_text: findEnglish(flavor_text_entries)?.flavor_text ?? "No description available",
    effect: findEnglish(effect_entries)?.short_effect ?? "No effect available",
  })),
  sprites: pokemon.sprites,
});

/**
 * Turns the PokeAPI responses for one Pokémon into what the Pokébox stores
 * and serves, matching rust-server's `to_pokebox_entry`. `varieties` are the
 * species' other forms in any order; they come out in the species' order.
 */
export const toPokeboxEntry = (
  main: FetchedPokemon,
  species: PokemonSpecies,
  varieties: FetchedPokemon[],
): MappedEntry => {
  const speciesText =
    findEnglish(species.flavor_text_entries)?.flavor_text ?? "No description available";
  const order = species.varieties.map((v) => v.pokemon.name);
  const isDefault = (fetched: FetchedPokemon) =>
    species.varieties.find((v) => v.pokemon.name === fetched.pokemon.name)?.is_default ??
    fetched.pokemon.is_default;

  return {
    ...toForm(main, speciesText),
    varieties: varieties
      .map((v) => ({ ...toForm(v, speciesText), is_default: isDefault(v) }))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
  };
};
