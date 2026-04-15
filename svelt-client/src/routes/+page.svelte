<script lang="ts">
  import { goto } from "$app/navigation";
  import { typedFetch } from "$lib/typed-fetch";

  type PokedexEntry = {
    id: number;
    name: string;
  };

  export let data: { pokedex: PokedexEntry[] };

  const pokedex: PokedexEntry[] = data.pokedex;
  let idOrName = "";
  let filteredPokedex: PokedexEntry[] = [];
  let randomLoading = false;

  function updateSearch(value: string) {
    idOrName = value;
    if (value.trim().length > 0) {
      filteredPokedex = pokedex
        .filter(
          (pokemon) =>
            pokemon.name.toLowerCase().includes(value.toLowerCase()) ||
            pokemon.id.toString().includes(value)
        )
        .slice(0, 10);
    } else {
      filteredPokedex = [];
    }
  }

  async function handleSearch(event: Event) {
    event.preventDefault();
    if (!idOrName.trim()) {
      return;
    }

    await goto(`/pokemon/${encodeURIComponent(idOrName.trim())}`);
  }

  async function handleRandomNewPokemon() {
    randomLoading = true;
    try {
      const pokemon = await typedFetch<{ id: number; name: string }>(
        "http://localhost:3000/pokemon/random-new"
      );
      await goto(`/pokemon/${pokemon.name}`);
    } catch (error) {
      console.error("Failed to fetch a random new Pokémon:", error);
    } finally {
      randomLoading = false;
    }
  }

  const featuredPokemon = [37, 77, 151, 647, 700]
    .map((id) => pokedex.find((pokemon) => pokemon.id === id))
    .filter((pokemon): pokemon is PokedexEntry => Boolean(pokemon));
</script>

<svelte:head>
  <title>Pokédex Explorer</title>
</svelte:head>

<div class="min-h-screen bg-cc-base py-8">
  <div class="mx-auto max-w-6xl space-y-8 px-4">
    <section class="rounded-3xl bg-cc-card text-cc-text p-8 shadow-md">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-cc-text mb-3">Pokédex Explorer</h1>
        <p class="text-cc-subtext text-lg">
          Discover and learn about Pokémon with search, random discovery, and
          cached browsing.
        </p>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div class="rounded-3xl bg-cc-card text-cc-text p-8 shadow-md border border-cc-surface1">
        <h2 class="text-3xl font-semibold mb-6">Search Pokémon</h2>
        <form on:submit={handleSearch} class="space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row">
            <input
              class="w-full rounded-3xl border border-cc-surface2 bg-cc-base px-5 py-4 text-cc-text outline-none focus:border-cc-text focus:ring-1 focus:ring-cc-text"
              type="text"
              placeholder="e.g. pikachu or 25"
              value={idOrName}
              on:input={(event) => updateSearch((event.target as HTMLInputElement).value)}
            />
            <button
              type="submit"
              class="rounded-3xl btn-cc-primary px-6 py-4 disabled:opacity-60"
              disabled={!idOrName.trim()}
            >
              Search
            </button>
          </div>
          <button
            type="button"
            class="rounded-3xl btn-cc-secondary px-6 py-4"
            on:click={handleRandomNewPokemon}
            disabled={randomLoading}
          >
            {randomLoading ? "Loading…" : "Random New Pokémon"}
          </button>
        </form>

        {#if filteredPokedex.length > 0}
          <div class="mt-6 rounded-3xl border border-cc-surface2 bg-cc-mantle p-4">
            <h3 class="text-xl font-semibold mb-3 text-cc-text">Search Results</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              {#each filteredPokedex as pokemon (pokemon.id)}
                <a
                  class="rounded-3xl border border-cc-surface2 bg-cc-base px-4 py-3 text-cc-text hover:bg-cc-surface2"
                  href={`/pokemon/${pokemon.name}`}
                >
                  <span class="font-mono text-cc-subtext">#{pokemon.id.toString().padStart(3, "0")}</span>
                  <span class="ml-2 capitalize">{pokemon.name}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="rounded-3xl bg-cc-card text-cc-text p-8 shadow-md border border-cc-surface1">
        <h2 class="text-3xl font-semibold mb-6">Pokédex Statistics</h2>
        <div class="grid gap-4">
          <div class="rounded-3xl bg-cc-mantle p-6">
            <p class="text-cc-subtext">Total Pokémon in list</p>
            <p class="text-4xl font-bold text-cc-text">{pokedex.length}</p>
          </div>
          <div class="rounded-3xl bg-cc-mantle p-6">
            <p class="text-cc-subtext">Pokémon left to discover</p>
            <p class="text-4xl font-bold text-cc-text">{1025 - pokedex.length}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-3xl bg-cc-card text-cc-text p-8 shadow-md border border-cc-surface1">
        <h2 class="text-3xl font-semibold mb-6">Featured Pokémon</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each featuredPokemon as pokemon (pokemon.id)}
            <a
              href={`/pokemon/${pokemon.name}`}
              class="rounded-3xl border border-cc-surface2 bg-cc-mantle p-6 text-left hover:bg-cc-surface2"
            >
              <p class="font-semibold text-cc-text">#{pokemon.id.toString().padStart(3, "0")}</p>
              <p class="capitalize text-xl text-cc-text">{pokemon.name}</p>
            </a>
          {/each}
        </div>
      </div>

      <div class="rounded-3xl bg-cc-card text-cc-text p-8 shadow-md border border-cc-surface1">
        <h2 class="text-3xl font-semibold mb-6">Browse Seen Pokémon</h2>
        <select
          class="w-full rounded-3xl border border-cc-surface2 bg-cc-base px-5 py-4 text-cc-text outline-none focus:border-cc-text focus:ring-1 focus:ring-cc-text"
          on:change={(event) => goto(`/pokemon/${(event.target as HTMLSelectElement).value}`)}
        >
          <option value="" disabled selected>Choose a Pokémon...</option>
          {#each pokedex as pokemon (pokemon.id)}
            <option value={pokemon.name}>
              #{pokemon.id.toString().padStart(3, "0")} - {pokemon.name}
            </option>
          {/each}
        </select>
      </div>
    </section>
  </div>
</div>
