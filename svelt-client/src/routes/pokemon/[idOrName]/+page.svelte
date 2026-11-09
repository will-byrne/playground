<script lang="ts">
  import { goto } from "$app/navigation";
  import { CLIENT } from "$lib/client";
  import {
    TEXT,
    getAppTitle,
    homePath,
    type Backend,
    type FetchErrorKind,
    type PokeboxEntry,
  } from "$lib/pokedex";
  import PokemonDetail from "./PokemonDetail.svelte";

  let {
    data,
  }: {
    data: { backend: Backend; idOrName: string; pokemon: PokeboxEntry | null; errorKind: FetchErrorKind | null };
  } = $props();

  const errorKind = $derived(data.errorKind ?? "not-found");
</script>

<svelte:head>
  <title>{data.pokemon ? `${data.pokemon.name} | ${getAppTitle(CLIENT)}` : TEXT.pokemonErrorTitle(errorKind)}</title>
</svelte:head>

{#if data.pokemon}
  <!-- Keyed on the id so form and sprite selection reset when moving to another Pokémon. -->
  {#key data.pokemon.id}
    <PokemonDetail pokemon={data.pokemon} backend={data.backend} />
  {/key}
{:else}
  <div class="pd-page">
    <div class="pd-container pd-container--wide">
      <div class="pd-center">
        <h1 class="pd-title pd-title--detail" style="margin-bottom: 1rem">{TEXT.pokemonErrorTitle(errorKind)}</h1>
        <p class="pd-subtitle" style="margin-bottom: 1.5rem">{TEXT.pokemonError(data.idOrName, data.backend, errorKind)}</p>
        <button type="button" class="pd-btn pd-btn--primary" onclick={() => goto(homePath(data.backend))}>
          {TEXT.backToList}
        </button>
      </div>
    </div>
  </div>
{/if}
