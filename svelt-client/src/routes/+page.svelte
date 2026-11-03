<script lang="ts">
  import { goto } from "$app/navigation";
  import { CLIENT } from "$lib/client";
  import {
    BACKEND_OPTIONS,
    TEXT,
    getAppTitle,
    capitalize,
    fetchRandomNewPokemon,
    formatDexNo,
    getBackend,
    getFeaturedPokemon,
    getLeftToDiscover,
    getLeftToDiscoverDesc,
    homePath,
    pokemonPath,
    searchPokedex,
    type Backend,
    type PokedexEntry,
  } from "$lib/pokedex";

  let { data }: { data: { backend: Backend; pokedex: PokedexEntry[]; error: string | null } } = $props();

  let idOrName = $state("");
  let randomLoading = $state(false);
  let randomError = $state<string | null>(null);

  const searchResults = $derived(searchPokedex(data.pokedex, idOrName));
  const featuredPokemon = $derived(getFeaturedPokemon(data.pokedex));
  const error = $derived(data.error ?? randomError);

  function handleSearch(event: SubmitEvent) {
    event.preventDefault();
    if (idOrName.trim()) goto(pokemonPath(idOrName.trim(), data.backend));
  }

  async function handleRandomNewPokemon() {
    randomLoading = true;
    randomError = null;
    try {
      const pokemon = await fetchRandomNewPokemon(data.backend);
      await goto(pokemonPath(pokemon.name, data.backend));
    } catch (err) {
      console.error("Failed to fetch a random new Pokémon:", err);
      randomError = TEXT.randomError;
    } finally {
      randomLoading = false;
    }
  }
</script>

<svelte:head>
  <title>{getAppTitle(CLIENT)}</title>
</svelte:head>

<div class="pd-page">
  <div class="pd-container">
    <!-- Header -->
    <div class="pd-header">
      <h1 class="pd-title">{getAppTitle(CLIENT)}</h1>
      <p class="pd-subtitle">{TEXT.subtitle}</p>
    </div>

    {#if error}
      <div role="alert" class="pd-alert">{error}</div>
    {/if}

    <!-- Search Section -->
    <div class="pd-card pd-section">
      <div class="pd-card__body">
        <div class="pd-card__title-row">
          <h2 class="pd-card__title">{TEXT.searchTitle}</h2>
          <label class="pd-field">
            <span class="pd-label pd-label--tight">{TEXT.backendLabel}</span>
            <select
              aria-label={TEXT.backendLabel}
              class="pd-select"
              value={data.backend}
              onchange={(event) => goto(homePath(getBackend(event.currentTarget.value)))}
            >
              {#each BACKEND_OPTIONS as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
        </div>
        <form onsubmit={handleSearch}>
          <div class="pd-field">
            <label class="pd-label" for="idOrNameInput">{TEXT.searchLabel}</label>
            <div class="pd-join">
              <input
                id="idOrNameInput"
                type="text"
                placeholder={TEXT.searchPlaceholder}
                class="pd-input pd-grow"
                bind:value={idOrName}
              />
              <button type="submit" class="pd-btn pd-btn--primary" disabled={!idOrName.trim()}>
                {TEXT.search}
              </button>
              <button type="button" class="pd-btn" onclick={handleRandomNewPokemon} disabled={randomLoading}>
                {randomLoading ? TEXT.loading : TEXT.random}
              </button>
            </div>
          </div>
        </form>

        <!-- Search Results -->
        {#if searchResults.length > 0}
          <div style="margin-top: 1rem">
            <h3 class="pd-subheading">{TEXT.searchResults}</h3>
            <div class="pd-grid pd-grid--tight pd-grid--results">
              {#each searchResults as pokemon (pokemon.id)}
                <a href={pokemonPath(pokemon.name, data.backend)} class="pd-btn pd-btn--outline pd-btn--sm pd-btn--start">
                  <span class="pd-mono">{formatDexNo(pokemon.id)}</span>
                  <span class="pd-capitalize">{pokemon.name}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Featured Pokémon -->
    <div class="pd-section">
      <h2 class="pd-heading">{TEXT.featured}</h2>
      <div class="pd-grid pd-grid--featured">
        {#each featuredPokemon as pokemon (pokemon.id)}
          <div class="pd-card pd-card--lg">
            <div class="pd-card__body pd-card__body--compact pd-card__body--center">
              <h3 class="pd-card__title pd-card__title--md pd-card__title--center">{formatDexNo(pokemon.id)}</h3>
              <p class="pd-capitalize" style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem">
                {pokemon.name}
              </p>
              <a href={pokemonPath(pokemon.name, data.backend)} class="pd-btn pd-btn--primary pd-btn--sm">
                {TEXT.viewDetails}
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="pd-card pd-section">
      <div class="pd-card__body pd-card__body--center">
        <h2 class="pd-card__title pd-card__title--center" style="margin-bottom: 1rem">{TEXT.statsTitle}</h2>
        <div class="pd-stats">
          <div class="pd-stat">
            <div class="pd-stat__title">{TEXT.statTotalTitle}</div>
            <div class="pd-stat__value pd-stat__value--primary">{data.pokedex.length}</div>
            <div class="pd-stat__desc">{TEXT.statTotalDesc}</div>
          </div>
          <div class="pd-stat">
            <div class="pd-stat__title">{TEXT.statLeftTitle}</div>
            <div class="pd-stat__value pd-stat__value--secondary">{getLeftToDiscover(data.pokedex)}</div>
            <div class="pd-stat__desc">{getLeftToDiscoverDesc(data.pokedex)}</div>
          </div>
          <div class="pd-stat">
            <div class="pd-stat__title">{TEXT.statLastUpdatedTitle}</div>
            <div class="pd-stat__value pd-stat__value--accent">{TEXT.statLastUpdatedValue}</div>
            <div class="pd-stat__desc">{TEXT.statLastUpdatedDesc}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Browse Pokédex Pokémon -->
    <div class="pd-card">
      <div class="pd-card__body">
        <h2 class="pd-card__title" style="margin-bottom: 1rem">{TEXT.browseTitle}</h2>
        <div class="pd-field">
          <label class="pd-label" for="dexSelector">{TEXT.browseLabel}</label>
          <select
            id="dexSelector"
            class="pd-select pd-select--lg"
            onchange={(event) => {
              if (event.currentTarget.value) goto(pokemonPath(event.currentTarget.value, data.backend));
            }}
          >
            <option value="" disabled selected>{TEXT.browsePlaceholder}</option>
            {#each data.pokedex as pokemon (pokemon.id)}
              <option value={pokemon.name}>{formatDexNo(pokemon.id)} - {capitalize(pokemon.name)}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
  </div>
</div>
