package com.pokemon.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * A cached Pokémon, shaped exactly like rust-server's PokeboxEntry so every
 * server can read and write the same MongoDB documents.
 */
public record PokeboxEntry(
        long id,
        String name,
        @JsonProperty("species_description") String speciesDescription,
        List<String> types,
        List<PokemonAbility> abilities,
        Object sprites
) {
}
