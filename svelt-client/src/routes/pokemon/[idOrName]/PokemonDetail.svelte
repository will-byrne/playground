<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    TEXT,
    canGoToNext,
    canGoToPrevious,
    formatDescription,
    formatDexNo,
    formatSpriteName,
    getDefaultSpriteKey,
    getDisplaySpriteKey,
    getShinySpriteKey,
    getSprites,
    getTypeStyle,
    homePath,
    pokemonPath,
    type Backend,
    type PokeboxEntry,
  } from "$lib/pokedex";

  let { pokemon, backend }: { pokemon: PokeboxEntry; backend: Backend } = $props();

  const spriteList = $derived(getSprites(pokemon.sprites));
  // The parent re-creates this component per Pokémon, so seeding from the first value is intended.
  // svelte-ignore state_referenced_locally
  let selectedSpriteKey = $state(getDefaultSpriteKey(getSprites(pokemon.sprites)));
  let showShiny = $state(false);
  const displaySpriteKey = $derived(getDisplaySpriteKey(spriteList, selectedSpriteKey, showShiny));
  const hasShiny = $derived(Boolean(getShinySpriteKey(spriteList, selectedSpriteKey)));
</script>

<div class="pd-page">
  <div class="pd-container pd-container--wide">
    <!-- Header -->
    <div class="pd-detail-header">
      <button type="button" class="pd-btn" onclick={() => goto(homePath(backend))}>{TEXT.backToList}</button>
      <div class="pd-detail-nav">
        {#if canGoToPrevious(pokemon.id)}
          <button
            type="button"
            class="pd-btn pd-btn--outline"
            onclick={() => goto(pokemonPath(pokemon.id - 1, backend))}
            aria-label="Previous Pokémon"
          >
            {TEXT.previous}
          </button>
        {:else}
          <div class="pd-spacer"></div>
        {/if}
        <div>
          <h1 class="pd-title pd-title--detail pd-capitalize">{pokemon.name}</h1>
          <p class="pd-subtitle">{formatDexNo(pokemon.id)}</p>
        </div>
        {#if canGoToNext(pokemon.id)}
          <button
            type="button"
            class="pd-btn pd-btn--outline"
            onclick={() => goto(pokemonPath(pokemon.id + 1, backend))}
            aria-label="Next Pokémon"
          >
            {TEXT.next}
          </button>
        {:else}
          <div class="pd-spacer"></div>
        {/if}
      </div>
    </div>

    <div class="pd-grid pd-grid--detail">
      <!-- Pokémon Image Card -->
      <div class="pd-card">
        <div class="pd-card__body pd-card__body--center">
          <img alt={`${pokemon.name} sprite`} src={spriteList[displaySpriteKey]} class="pd-main-sprite" />
          {#if hasShiny}
            <label class="pd-toggle-label">
              <input type="checkbox" class="pd-toggle" bind:checked={showShiny} />
              {TEXT.shiny}
            </label>
          {/if}
          <div class="pd-badges">
            {#each pokemon.types as type (type)}
              <span class="pd-badge" style={getTypeStyle(type)}>{type}</span>
            {/each}
          </div>
        </div>
      </div>

      <!-- Pokémon Details Card -->
      <div class="pd-card">
        <div class="pd-card__body">
          <h2 class="pd-card__title" style="margin-bottom: 1rem">{TEXT.description}</h2>
          <p class="pd-description">{formatDescription(pokemon.species_description)}</p>
        </div>
      </div>
    </div>

    <!-- Abilities Section -->
    <div class="pd-section--detail">
      <h2 class="pd-heading pd-heading--detail">{TEXT.abilities}</h2>
      <div class="pd-grid pd-grid--abilities">
        {#each pokemon.abilities as ability (ability.name)}
          <div class="pd-card pd-card--lg">
            <div class="pd-card__body">
              <h3 class="pd-card__title pd-card__title--ability">{ability.name}</h3>
              <p class="pd-ability-flavour">{ability.flavour_text}</p>
              <p class="pd-ability-effect">{ability.effect}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Sprite Gallery -->
    <div class="pd-section--detail">
      <h2 class="pd-heading pd-heading--detail">{TEXT.sprites}</h2>
      <div class="pd-grid pd-grid--sprites">
        {#each Object.entries(spriteList) as [name, url] (name)}
          {@const selected = name === selectedSpriteKey}
          <button
            type="button"
            class="pd-card pd-card--md pd-sprite-card"
            class:pd-sprite-card--selected={selected}
            onclick={() => (selectedSpriteKey = name)}
            aria-pressed={selected}
          >
            <div class="pd-card__body pd-card__body--compact pd-card__body--center">
              <img alt={name} src={url} />
              <p class="pd-sprite-label" class:pd-sprite-label--selected={selected}>
                {selected ? TEXT.selected : formatSpriteName(name)}
              </p>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
