package com.pokemon.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Another form of the same species as a {@link PokeboxEntry}, complete so
 * clients can switch to it without another request.
 */
public record PokemonVariety(
        long id,
        String name,
        @JsonProperty("form_name") String formName,
        @JsonProperty("is_default") boolean isDefault,
        @JsonProperty("species_description") String speciesDescription,
        List<String> types,
        List<PokemonAbility> abilities,
        Object sprites
) {
}
