package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
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

        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(
                new PokeApiMapper.FetchedPokemon(pokemon, List.of(overgrow), MissingNode.getInstance()),
                species, List.of());

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
        assertThat(entry.formName()).isEmpty();
        assertThat(entry.varieties()).isEmpty();
    }

    // Trimmed PokeAPI responses for Vulpix and Alolan Vulpix, with real values.

    private JsonNode vulpixSpecies() throws Exception {
        return parse("""
                {'flavor_text_entries': [{'flavor_text': 'At the time of birth, it has just one tail.', 'language': {'name': 'en'}}],
                 'varieties': [{'is_default': true, 'pokemon': {'name': 'vulpix'}},
                               {'is_default': false, 'pokemon': {'name': 'vulpix-alola'}}]}
                """);
    }

    private PokeApiMapper.FetchedPokemon vulpix() throws Exception {
        return new PokeApiMapper.FetchedPokemon(parse("""
                {'id': 37, 'name': 'vulpix', 'is_default': true, 'types': [{'type': {'name': 'fire'}}],
                 'sprites': {'front_default': '37.png'}}
                """), List.of(), parse("{'form_names': [], 'flavor_text_entries': []}"));
    }

    private PokeApiMapper.FetchedPokemon alolanVulpix() throws Exception {
        return new PokeApiMapper.FetchedPokemon(parse("""
                {'id': 10103, 'name': 'vulpix-alola', 'is_default': false, 'types': [{'type': {'name': 'ice'}}],
                 'sprites': {'front_default': '10103.png'}}
                """), List.of(parse("""
                {'name': 'snow-cloak',
                 'flavor_text_entries': [{'flavor_text': 'Ups evasion in a hailstorm.', 'language': {'name': 'en'}}],
                 'effect_entries': [{'short_effect': 'Increases evasion during hail.', 'language': {'name': 'en'}}]}
                """)), parse("""
                {'form_names': [{'name': 'Forme d’Alola', 'language': {'name': 'fr'}},
                                {'name': 'Alolan Form', 'language': {'name': 'en'}}],
                 'flavor_text_entries': [{'flavor_text': 'It exhales air colder than -58 degrees Fahrenheit.',
                                          'language': {'name': 'en'}}]}
                """));
    }

    @Test
    void carriesAlternateFormsInFull() throws Exception {
        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(vulpix(), vulpixSpecies(), List.of(alolanVulpix()));

        assertThat(entry.types()).containsExactly("fire");
        assertThat(entry.speciesDescription()).isEqualTo("At the time of birth, it has just one tail.");
        assertThat(entry.varieties()).singleElement().satisfies(alola -> {
            assertThat(alola.id()).isEqualTo(10103);
            assertThat(alola.name()).isEqualTo("vulpix-alola");
            assertThat(alola.formName()).isEqualTo("Alolan Form");
            assertThat(alola.isDefault()).isFalse();
            assertThat(alola.speciesDescription()).isEqualTo("It exhales air colder than -58 degrees Fahrenheit.");
            assertThat(alola.types()).containsExactly("ice");
            assertThat(alola.abilities()).containsExactly(new PokemonAbility(
                    "snow-cloak", "Ups evasion in a hailstorm.", "Increases evasion during hail."));
            assertThat(((Document) alola.sprites()).getString("front_default")).isEqualTo("10103.png");
        });
    }

    @Test
    void anAlternateFormListsTheDefault() throws Exception {
        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(alolanVulpix(), vulpixSpecies(), List.of(vulpix()));

        assertThat(entry.id()).isEqualTo(10103);
        assertThat(entry.formName()).isEqualTo("Alolan Form");
        assertThat(entry.varieties()).singleElement().satisfies(vulpix -> {
            assertThat(vulpix.name()).isEqualTo("vulpix");
            assertThat(vulpix.isDefault()).isTrue();
            assertThat(vulpix.formName()).isEmpty();
        });
    }

    @Test
    void aFormWithoutItsOwnTextUsesTheSpecies() throws Exception {
        PokeApiMapper.FetchedPokemon alola = alolanVulpix();
        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(
                new PokeApiMapper.FetchedPokemon(alola.pokemon(), alola.abilities(), MissingNode.getInstance()),
                vulpixSpecies(), List.of());

        assertThat(entry.speciesDescription()).isEqualTo("At the time of birth, it has just one tail.");
        assertThat(entry.formName()).isEmpty();
    }

    @Test
    void ordersVarietiesLikeTheSpecies() throws Exception {
        JsonNode species = parse("""
                {'varieties': [{'is_default': true, 'pokemon': {'name': 'vulpix'}},
                               {'is_default': false, 'pokemon': {'name': 'vulpix-alola'}},
                               {'is_default': false, 'pokemon': {'name': 'vulpix-other'}}]}
                """);
        PokeApiMapper.FetchedPokemon other = new PokeApiMapper.FetchedPokemon(
                parse("{'id': 10999, 'name': 'vulpix-other', 'sprites': {'front_default': null}}"), List.of(), MissingNode.getInstance());

        PokeboxEntry entry = PokeApiMapper.toPokeboxEntry(vulpix(), species, List.of(other, alolanVulpix()));

        assertThat(entry.varieties()).extracting(v -> v.name()).containsExactly("vulpix-alola", "vulpix-other");
    }

    @Test
    void fallsBackWhenNoEnglishTextExists() throws Exception {
        PokemonAbility ability = PokeApiMapper.toAbility(parse("{'name': 'mystery'}"));

        assertThat(ability).isEqualTo(
                new PokemonAbility("mystery", PokeApiMapper.NO_DESCRIPTION, PokeApiMapper.NO_EFFECT));
    }
}
