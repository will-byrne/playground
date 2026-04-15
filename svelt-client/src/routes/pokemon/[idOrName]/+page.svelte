<script lang="ts">
  import { goto } from "$app/navigation";
	import type { PokemonSprites } from "pokenode-ts";
  
  type PokeboxEntry = {
    id: number;
    name: string;
    species_description: string;
    types: string[];
    abilities: {
      name: string;
      flavour_text: string;
      effect: string;
    }[];
    sprites: PokemonSprites;
  };

  export let data: { pokemon: PokeboxEntry | null };

  const pokemon = data.pokemon;
  let showShiny = false;

  const canGoToPrevious = pokemon ? pokemon.id > 1 : false;
  const canGoToNext = pokemon ? pokemon.id < 1025 : false;

  function getTypeColor(type: string) {
    const typeColors: Record<string, string> = {
      normal: "bg-slate-400 text-white",
      fire: "bg-red-500 text-white",
      water: "bg-blue-500 text-white",
      grass: "bg-emerald-500 text-white",
      electric: "bg-yellow-300 text-black",
      ice: "bg-cyan-400 text-black",
      fighting: "bg-orange-700 text-white",
      poison: "bg-purple-500 text-white",
      ground: "bg-amber-600 text-white",
      flying: "bg-sky-400 text-black",
      psychic: "bg-pink-500 text-white",
      bug: "bg-lime-500 text-black",
      rock: "bg-slate-600 text-white",
      ghost: "bg-violet-700 text-white",
      dragon: "bg-indigo-600 text-white",
      dark: "bg-slate-800 text-white",
      steel: "bg-slate-500 text-white",
      fairy: "bg-fuchsia-400 text-black",
    };
    return typeColors[type.toLowerCase()] ?? "bg-slate-400 text-white";
  }

  function getSprites(sp: PokemonSprites, k?: string): Record<string, string> {
    const result = Object.entries(sp).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === "string" && value) {
          const newKey = `${k ? `${k}-` : ""}${key}`;
          acc[newKey] = value;
        } else if (value && typeof value === "object") {
          Object.assign(acc, getSprites(value, key));
        }
        return acc;
      },
      {}
    );

    return result;
  };

  function navigateToPokemon(id: number) {
    goto(`/pokemon/${id}`);
  }

  const spriteList = pokemon ? getSprites(pokemon.sprites) : {};
  const officialArtFront = spriteList["official-artwork-front_default"] ?? spriteList["showdown-front_default"] ?? "";
  const officialArtShiny = spriteList["official-artwork-front_shiny"] ?? spriteList["showdown-front_shiny"] ?? "";
  let displayImage = showShiny ? officialArtShiny || officialArtFront : officialArtFront || officialArtShiny || "";

  $: displayImage = showShiny
    ? officialArtShiny || officialArtFront
    : officialArtFront || officialArtShiny || "";
</script>

<svelte:head>
  <title>{pokemon ? `Pokémon ${pokemon.name}` : "Pokémon Not Found"}</title>
</svelte:head>

<div class="min-h-screen bg-cc-base p-4">
  <div class="mx-auto max-w-6xl space-y-6">
    {#if !pokemon}
      <div class="rounded-3xl bg-cc-card p-8 shadow-md border border-cc-surface1">
        <h1 class="text-4xl font-bold mb-4 text-cc-text">Pokémon Not Found</h1>
        <p class="text-cc-subtext mb-6">
          The Pokémon you requested could not be found.
        </p>
        <button
          class="rounded-full btn-cc-primary px-6 py-3 hover:bg-cc-sapphire"
          on:click={() => goto("/")}
        >
          Back to list
        </button>
      </div>
    {:else}
      <div class="rounded-3xl bg-cc-card p-6 shadow-md border border-cc-surface1">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <button
            class="rounded-full border border-cc-surface2 bg-cc-mantle px-5 py-3 text-cc-text hover:bg-cc-surface2"
            on:click={() => goto("/")}
          >
            Back to list
          </button>

          <div class="text-center">
            <h1 class="text-4xl font-bold capitalize text-cc-text">{pokemon.name}</h1>
            <p class="text-cc-subtext">#{pokemon.id.toString().padStart(3, "0")}</p>
          </div>

          <div class="flex gap-3 justify-center">
            <button
              class="rounded-full border border-cc-surface2 bg-cc-mantle px-5 py-3 text-cc-text hover:bg-cc-surface2 disabled:opacity-50"
              on:click={() => canGoToPrevious && navigateToPokemon(pokemon.id - 1)}
              disabled={!canGoToPrevious}
            >
              ← Prev
            </button>
            <button
              class="rounded-full border border-cc-surface2 bg-cc-mantle px-5 py-3 text-cc-text hover:bg-cc-surface2 disabled:opacity-50"
              on:click={() => canGoToNext && navigateToPokemon(pokemon.id + 1)}
              disabled={!canGoToNext}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div class="rounded-3xl bg-cc-card p-6 shadow-md border border-cc-surface1">
          <div class="flex flex-col items-center gap-5 text-center">
            <img
              src={displayImage}
              alt={pokemon.name}
              class="h-64 w-full max-w-md object-contain"
            />
            <label class="inline-flex items-center gap-2 rounded-full bg-cc-mantle px-4 py-2 text-cc-text">
              <input type="checkbox" bind:checked={showShiny} />
              Show shiny
            </label>
            <div class="flex flex-wrap justify-center gap-2">
              {#each pokemon.types as type}
                <span class={`rounded-full px-3 py-1 text-sm font-semibold ${getTypeColor(type)}`}>
                  {type}
                </span>
              {/each}
            </div>
          </div>
        </div>

        <div class="rounded-3xl bg-cc-card p-6 shadow-md border border-cc-surface1">
          <h2 class="text-2xl font-semibold mb-4 text-cc-text">Description</h2>
          <p class="text-cc-subtext leading-relaxed">
            {pokemon.species_description.replace(/\r?\n/g, " ")}
          </p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-3xl bg-cc-card p-6 shadow-md border border-cc-surface1">
          <h2 class="text-2xl font-semibold mb-4 text-cc-text">Abilities</h2>
          <div class="space-y-4">
            {#each pokemon.abilities as ability}
              <div class="rounded-3xl border border-cc-surface2 bg-cc-mantle p-4">
                <h3 class="text-xl font-semibold capitalize mb-2 text-cc-text">{ability.name}</h3>
                <p class="italic text-cc-subtext mb-2">{ability.flavour_text}</p>
                <p class="text-cc-subtext-alt text-sm">{ability.effect}</p>
              </div>
            {/each}
          </div>
        </div>

        <div class="rounded-3xl bg-cc-card p-6 shadow-md border border-cc-surface1">
          <h2 class="text-2xl font-semibold mb-4 text-cc-text">Sprites</h2>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {#each Object.entries(spriteList) as [name, url]}
              <div class="rounded-3xl border border-cc-surface2 bg-cc-mantle p-4 text-center">
                <img alt={name} src={url} class="mx-auto h-16 w-16 object-contain" />
                <p class="mt-2 text-xs text-cc-subtext">{name.replace(/[-_]/g, " ")}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
