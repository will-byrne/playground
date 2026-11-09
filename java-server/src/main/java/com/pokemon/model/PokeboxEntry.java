package com.pokemon.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * A cached Pokémon, shaped exactly like rust-server's PokeboxEntry so every
 * server can read and write the same MongoDB documents.
 *
 * @param formName           English form name ("Alolan Form"), or "" when the form has none
 * @param speciesDescription the form's own English flavour text if it has one, else the species'
 * @param varieties          the species' other forms, never this one
 */
public record PokeboxEntry(
        long id,
        String name,
        @JsonProperty("form_name") String formName,
        @JsonProperty("species_description") String speciesDescription,
        List<String> types,
        List<PokemonAbility> abilities,
        Object sprites,
        List<PokemonVariety> varieties
) {
}
