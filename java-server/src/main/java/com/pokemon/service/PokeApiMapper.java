package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokemonAbility;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.StreamSupport;

/** Turns PokeAPI responses into a PokeboxEntry, the same way rust-server does. */
final class PokeApiMapper {

    static final String NO_DESCRIPTION = "No description available";
    static final String NO_EFFECT = "No effect available";

    private PokeApiMapper() {
    }

    static PokeboxEntry toPokeboxEntry(JsonNode pokemon, JsonNode species, List<JsonNode> abilities) {
        List<String> types = new ArrayList<>();
        pokemon.path("types").forEach(type -> types.add(type.path("type").path("name").asText()));

        return new PokeboxEntry(
                pokemon.path("id").asLong(),
                pokemon.path("name").asText(),
                englishEntry(species.path("flavor_text_entries"), "flavor_text", NO_DESCRIPTION),
                types,
                abilities.stream().map(PokeApiMapper::toAbility).toList(),
                Document.parse(pokemon.path("sprites").toString()));
    }

    static PokemonAbility toAbility(JsonNode ability) {
        return new PokemonAbility(
                ability.path("name").asText(),
                englishEntry(ability.path("flavor_text_entries"), "flavor_text", NO_DESCRIPTION),
                englishEntry(ability.path("effect_entries"), "short_effect", NO_EFFECT));
    }

    /** The given field of the first entry whose language is English, or the fallback. */
    static String englishEntry(JsonNode entries, String field, String fallback) {
        return StreamSupport.stream(entries.spliterator(), false)
                .filter(entry -> "en".equals(entry.path("language").path("name").asText()))
                .findFirst()
                .map(entry -> entry.path(field).asText())
                .orElse(fallback);
    }
}
