import { PokemonClient, type Pokemon, type PokemonSpecies } from 'pokenode-ts';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve("src/content/pokemon");
const POKEDEX_SIZE = 1025;

function padId(id: number) {
  return String(id).padStart(3, '0');
}

function makePokemonJson(pokemon: Pokemon, species: PokemonSpecies) {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t: any) => t.type.name),
    sprite: pokemon.sprites.other && pokemon.sprites.other["official-artwork"].front_default ? pokemon.sprites.other["official-artwork"].front_default : pokemon.sprites.front_default,
    abilities: pokemon.abilities.map((a: any) => a.ability.name),
    description: species.flavor_text_entries.find((e: any) => e.language.name === 'en')?.flavor_text ?? '',
  }
}

async function main() {
  console.log("🔍 Checking existing Pokémon files...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '').replace(/^0+/, ''));
  console.log(`📁 Found ${existingFiles.length} existing entries.`);
  
  const allIds = Array.from({ length: POKEDEX_SIZE }, (_, i) => i + 1);
  const missingPokemon = allIds.filter((id) => !existingFiles.includes(id.toString()));
  console.log(`🔍 Found ${missingPokemon.length} missing entries.`);

  const api = new PokemonClient();
  console.log(missingPokemon);

  missingPokemon.forEach(async (id, i) => {
    console.log(`\n➡ Processing ${id} (${i + 1}/${existingFiles.length})`);

    const p = await api.getPokemonById(id);

    const fileId = padId(p.id); 

    console.log(`   🆕 Fetching details for ${p.name}...`);
    const species = await api.getPokemonSpeciesById(p.id);
    
    const data = makePokemonJson(p, species);
    const filePath = path.join(OUTPUT_DIR, `${fileId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved ${fileId}.json`);
  });

  console.log("\n🎉 Sync complete!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
})