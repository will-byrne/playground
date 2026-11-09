package com.pokemon.service;

import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokemonAbility;
import com.pokemon.model.PokemonVariety;
import org.bson.Document;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PokemonStoreTest {

    @Test
    void writesTheSharedSnakeCaseShape() {
        PokeboxEntry entry = new PokeboxEntry(37, "vulpix", "", "Fire fox", List.of("fire"),
                List.of(new PokemonAbility("flash-fire", "Powers up fire moves", "Absorbs fire moves")),
                new Document("front_default", "front.png"),
                List.of(new PokemonVariety(10103, "vulpix-alola", "Alolan Form", false, "Ice fox", List.of("ice"),
                        List.of(new PokemonAbility("snow-cloak", "Ups evasion", "Evasion in hail")),
                        new Document("front_default", "alola.png"))));

        Document doc = PokemonStore.toDocument(entry);

        assertThat(doc.keySet()).containsExactly(
                "id", "name", "form_name", "species_description", "types", "abilities", "sprites", "varieties");
        assertThat(doc.getList("abilities", Document.class).get(0).keySet())
                .containsExactly("name", "flavour_text", "effect");
        Document variety = doc.getList("varieties", Document.class).get(0);
        assertThat(variety.keySet()).containsExactly(
                "id", "name", "form_name", "is_default", "species_description", "types", "abilities", "sprites");
        assertThat(variety.getList("abilities", Document.class).get(0).keySet())
                .containsExactly("name", "flavour_text", "effect");
        assertThat(PokemonStore.fromDocument(doc)).isEqualTo(entry);
    }

    @Test
    void readsDocumentsWrittenByOtherServers() {
        // e.g. a JS server storing the id as a 32-bit int (or double) and no abilities field
        Document doc = new Document("id", 25.0)
                .append("name", "pikachu")
                .append("species_description", "Electric mouse")
                .append("types", List.of("electric"))
                .append("sprites", new Document());

        PokeboxEntry entry = PokemonStore.fromDocument(doc);

        assertThat(entry.id()).isEqualTo(25);
        assertThat(entry.abilities()).isEmpty();
        assertThat(entry.varieties()).isEmpty();
        assertThat(entry.formName()).isEmpty();
    }

    @Test
    void onlyMatchesEntriesStoredWithVarieties() {
        // Entries stored before varieties existed are refetched and replaced.
        Document filter = Document.parse(PokemonStore.storedWithVarieties(com.mongodb.client.model.Filters.eq("id", 37))
                .toBsonDocument().toJson());
        assertThat(filter.toJson()).isEqualTo(
                Document.parse("{'$and': [{'id': 37}, {'varieties': {'$exists': true}}]}").toJson());
    }

    @Test
    void randomUnseenIdSkipsSeenPokemon() {
        java.util.Set<Long> seen = new java.util.HashSet<>();
        for (long id = 1; id <= PokemonService.DEX_MAX; id++) {
            if (id != 151) seen.add(id);
        }
        assertThat(PokemonService.randomUnseenId(seen)).contains(151L);

        seen.add(151L);
        assertThat(PokemonService.randomUnseenId(seen)).isEmpty();
    }
}
