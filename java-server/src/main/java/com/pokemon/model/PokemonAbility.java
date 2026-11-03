package com.pokemon.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PokemonAbility(
        String name,
        @JsonProperty("flavour_text") String flavourText,
        String effect
) {
}
