import { PokemonClient, type Pokemon, type PokemonSpecies, type PokemonForm, type NamedAPIResourceList, type Ability } from "pokenode-ts";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.resolve("src/content/pokemon");
const POKEDEX_SIZE = 1025;
const RATE_LIMIT_DELAY = 100; // ms between requests to avoid API throttling
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // ms, will be multiplied by attempt number

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = MAX_RETRIES,
  initialDelay = RETRY_DELAY_BASE
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        const delay = initialDelay * attempt;
        console.log(`   ⏳ Retry attempt ${attempt}/${maxAttempts - 1}, waiting ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

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
    showdown: {
      default: p.sprites.other?.showdown?.front_default ?? null,
      shiny: p.sprites.other?.showdown?.front_shiny ?? null,
    }
  };
}

async function fetchFormSprites(
  formList: NamedAPIResourceList,
  api: PokemonClient,
  pokemonName: string
) {
  try {
    // filter forms that belong to this Pokémon
    const relatedForms = formList.results.filter(
      (f) =>
        f.name === pokemonName ||
        f.name.startsWith(`${pokemonName}-`) ||
        f.name.includes(`${pokemonName}-`)
    );

    // Fetch forms with rate limiting to avoid API throttling
    const forms: PokemonForm[] = [];
    for (const form of relatedForms) {
      try {
        const formData = await withRetry(() =>
          api.getPokemonFormByName(form.name)
        );
        forms.push(formData);
        await sleep(RATE_LIMIT_DELAY);
      } catch (err) {
        console.warn(`   ⚠️  Failed to fetch form ${form.name}: ${err}`);
      }
    }

    const variants: Record<string, { default: string | null; shiny: string | null }> = {};

    forms.forEach((form: PokemonForm) => {
      variants[form.name] = {
        default: form.sprites.front_default ?? null,
        shiny: form.sprites.front_shiny ?? null,
      };
    });

    return variants;
  } catch (err) {
    console.warn(`   ⚠️  Error fetching variants: ${err}`);
    return {};
  }
}

async function getAbilities(api: PokemonClient, pokemon: Pokemon): Promise<Ability[]> {
  const abilities: Ability[] = [];

  for (const ability of pokemon.abilities) {
    try {
      const abilityData = await withRetry(() =>
        api.getAbilityByName(ability.ability.name)
      );
      abilities.push(abilityData);
      await sleep(RATE_LIMIT_DELAY);
    } catch (err) {
      console.warn(`   ⚠️  Failed to fetch ability ${ability.ability.name}: ${err}`);
    }
  }

  return abilities;
}

function makePokemonJson(
  pokemon: Pokemon,
  species: PokemonSpecies,
  abilities: Ability[],
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
    abilities: abilities.map((a) => ({ name: a.name, description: a.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ') ?? ''})),
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

    try {
      const pokemon = await withRetry(() => api.getPokemonById(id));
      await sleep(RATE_LIMIT_DELAY);

      const species = await withRetry(() => api.getPokemonSpeciesById(id));
      await sleep(RATE_LIMIT_DELAY);

      const fileId = padId(pokemon.id);

      console.log(`   🆕 Fetching sprites…`);
      const spriteGroups = extractSprites(pokemon);

      console.log(`   ⚔️ Fetching abilities...`);
      const abilities = await getAbilities(api, pokemon);

      console.log(`   🌍 Fetching regional forms…`);
      const variants = await fetchFormSprites(formList, api, pokemon.name);

      const data = makePokemonJson(
        pokemon,
        species,
        abilities,
        spriteGroups,
        variants
      );
      const filePath = path.join(OUTPUT_DIR, `${fileId}.json`);

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`   💾 Saved ${fileId}.json`);
    } catch (err) {
      console.error(
        `❌ Failed to process Pokémon ${id}: ${err instanceof Error ? err.message : err}`
      );
      console.log(`   💾 Skipping ${id} and continuing...\n`);
    }
  }

  console.log("\n🎉 Sync complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
