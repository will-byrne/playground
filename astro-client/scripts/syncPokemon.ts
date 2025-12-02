import { PokemonClient, type Pokemon, type PokemonSpecies, type PokemonForm, type NamedAPIResourceList } from "pokenode-ts";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.resolve("src/content/pokemon");
const POKEDEX_SIZE = 1025;

function padId(id: number) {
  return String(id).padStart(3, "0");
}

function extractSprites(p: Pokemon) {
  return {
    official: {
      default: p.sprites.other?.["official-artwork"]?.front_default ?? null,
    },
    home: {
      default: p.sprites.other?.home?.front_default ?? null,
      shiny: p.sprites.other?.home?.front_shiny ?? null,
    },
    default: {
      default: p.sprites.front_default ?? null,
      shiny: p.sprites.front_shiny ?? null,
    },
  };
}

async function fetchFormSprites(formList: NamedAPIResourceList, api: PokemonClient, pokemonName: string) {
  try {

    // filter forms that belong to this Pokémon
    const relatedForms = formList.results.filter((f) =>
      f.name === pokemonName ||
      f.name.startsWith(`${pokemonName}-`) ||
      f.name.includes(`${pokemonName}-`)
    );

    const forms = await Promise.all(
      relatedForms.map((f) => api.getPokemonFormByName(f.name))
    );

    const variants: Record<string, { default: string | null; shiny: string | null }> = {};

    forms.forEach((form: PokemonForm) => {
      variants[form.name] = {
        default: form.sprites.front_default ?? null,
        shiny: form.sprites.front_shiny ?? null,
      };
    });

    return variants;
  } catch {
    return {};
  }
}

function makePokemonJson(
  pokemon: Pokemon,
  species: PokemonSpecies,
  spriteGroups: any,
  variants: Record<string, any>
) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t: any) => t.type.name),
    sprites: {
      ...spriteGroups,
      variants, // <-- add regional forms here
    },
    abilities: pokemon.abilities.map((a: any) => a.ability.name),
    description:
      species.flavor_text_entries.find((e: any) => e.language.name === "en")
        ?.flavor_text ?? "",
  };
}

/**
 * Main sync job
 */
async function main() {
  console.log("🔍 Checking existing Pokémon files...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const existingFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", "").replace(/^0+/, ""));

  console.log(`📁 Found ${existingFiles.length} existing entries.`);

  const allIds = Array.from({ length: POKEDEX_SIZE }, (_, i) => i + 1);
  const missingPokemon = allIds.filter(
    (id) => !existingFiles.includes(id.toString())
  );

  console.log(`🔍 Found ${missingPokemon.length} missing entries.`);

  const api = new PokemonClient();

  // fetch list of all forms
  const formList = await api.listPokemonForms(0, 2000);

  for (let i = 0; i < missingPokemon.length; i++) {
    const id = missingPokemon[i];

    console.log(`\n➡ Processing ${id} (${i + 1}/${missingPokemon.length})`);

    const pokemon = await api.getPokemonById(id);
    const species = await api.getPokemonSpeciesById(id);

    const fileId = padId(pokemon.id);

    console.log(`   🆕 Fetching sprites…`);
    const spriteGroups = extractSprites(pokemon);

    console.log(`   🌍 Fetching regional forms…`);
    const variants = await fetchFormSprites(formList, api, pokemon.name);

    const data = makePokemonJson(pokemon, species, spriteGroups, variants);
    const filePath = path.join(OUTPUT_DIR, `${fileId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved ${fileId}.json`);
  }

  console.log("\n🎉 Sync complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
