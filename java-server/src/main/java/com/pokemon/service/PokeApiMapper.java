package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokemonAbility;
import com.pokemon.model.PokemonVariety;
import org.bson.Document;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.StreamSupport;

/** Turns PokeAPI responses into a PokeboxEntry, the same way rust-server does. */
final class PokeApiMapper {

    static final String NO_DESCRIPTION = "No description available";
    static final String NO_EFFECT = "No effect available";

    private PokeApiMapper() {
    }

    /**
     * One PokeAPI {@code pokemon} resource and what it needs besides the
     * species: its abilities (in order, minus any that failed to fetch) and
     * its first {@code pokemon-form}, which is a missing node when there is none.
     */
    record FetchedPokemon(JsonNode pokemon, List<JsonNode> abilities, JsonNode form) {
    }

    /**
     * {@code varieties} are the species' other forms in any order; they come
     * out in the species' order.
     */
    static PokeboxEntry toPokeboxEntry(FetchedPokemon main, JsonNode species, List<FetchedPokemon> varieties) {
        String speciesText = englishEntry(species.path("flavor_text_entries"), "flavor_text", NO_DESCRIPTION);
        List<String> order = StreamSupport.stream(species.path("varieties").spliterator(), false)
                .map(v -> v.path("pokemon").path("name").asText())
                .toList();

        List<PokemonVariety> mapped = varieties.stream()
                .map(v -> toVariety(v, species, speciesText))
                .sorted(Comparator.comparingInt(v -> order.indexOf(v.name())))
                .toList();

        PokemonVariety form = toVariety(main, species, speciesText);
        return new PokeboxEntry(form.id(), form.name(), form.formName(), form.speciesDescription(),
                form.types(), form.abilities(), form.sprites(), mapped);
    }

    /** Describes a form by its own English flavour text, or {@code speciesText} when it has none. */
    private static PokemonVariety toVariety(FetchedPokemon fetched, JsonNode species, String speciesText) {
        JsonNode pokemon = fetched.pokemon();
        String name = pokemon.path("name").asText();
        boolean isDefault = StreamSupport.stream(species.path("varieties").spliterator(), false)
                .filter(v -> name.equals(v.path("pokemon").path("name").asText()))
                .findFirst()
                .map(v -> v.path("is_default").asBoolean())
                .orElse(pokemon.path("is_default").asBoolean());

        List<String> types = new ArrayList<>();
        pokemon.path("types").forEach(type -> types.add(type.path("type").path("name").asText()));

        return new PokemonVariety(
                pokemon.path("id").asLong(),
                name,
                englishEntry(fetched.form().path("form_names"), "name", ""),
                isDefault,
                englishEntry(fetched.form().path("flavor_text_entries"), "flavor_text", speciesText),
                types,
                fetched.abilities().stream().map(PokeApiMapper::toAbility).toList(),
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
