package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokemonAbility;
import org.bson.Document;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PokeApiMapperTest {

    private final ObjectMapper json = new ObjectMapper();

    private JsonNode parse(String value) throws Exception {
        return json.readTree(value.replace('\'', '"'));
    }

    @Test
    void buildsEntryFromPokeApiResponses() throws Exception {
        JsonNode pokemon = parse("""
                {'id': 1, 'name': 'bulbasaur', 'species': {'name': 'bulbasaur'},
                 'types': [{'type': {'name': 'grass'}}, {'type': {'name': 'poison'}}],
                 'sprites': {'front_default': 'front.png', 'other': {'showdown': {'front_default': 'sd.gif'}}}}
                """);
        JsonNode species = parse("""
                {'flavor_text_entries': [
                  {'flavor_text': 'Une graine', 'language': {'name': 'fr'}},
                  {'flavor_text': 'A strange seed', 'language': {'name': 'en'}}]}
                """);
        JsonNode overgrow = parse("""
                {'name': 'overgrow',
                 'flavor_text_entries': [{'flavor_text': 'Ups GRASS moves', 'language': {'name': 'en'}}],
                 'effect_entries': [{'short_effect': 'Strengthens grass moves', 'language': {'name': 'en'}}]}
                """);

        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(pokemon, species, List.of(overgrow));

        assertThat(entry.id()).isEqualTo(1);
        assertThat(entry.name()).isEqualTo("bulbasaur");
        assertThat(entry.speciesDescription()).isEqualTo("A strange seed");
        assertThat(entry.types()).containsExactly("grass", "poison");
        assertThat(entry.abilities()).containsExactly(
                new PokemonAbility("overgrow", "Ups GRASS moves", "Strengthens grass moves"));
        Document sprites = (Document) entry.sprites();
        assertThat(sprites.getString("front_default")).isEqualTo("front.png");
        assertThat(sprites.get("other", Document.class).get("showdown", Document.class).getString("front_default"))
                .isEqualTo("sd.gif");
    }

    @Test
    void fallsBackWhenNoEnglishTextExists() throws Exception {
        PokemonAbility ability = PokeApiMapper.toAbility(parse("{'name': 'mystery'}"));

        assertThat(ability).isEqualTo(
                new PokemonAbility("mystery", PokeApiMapper.NO_DESCRIPTION, PokeApiMapper.NO_EFFECT));
    }
}
