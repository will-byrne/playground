package com.pokemon.service;

import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokemonAbility;
import org.bson.Document;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PokemonStoreTest {

    @Test
    void writesTheSharedSnakeCaseShape() {
        PokeboxEntry entry = new PokeboxEntry(1, "bulbasaur", "A strange seed", List.of("grass"),
                List.of(new PokemonAbility("overgrow", "Ups GRASS moves", "Strengthens grass moves")),
                new Document("front_default", "front.png"));

        Document doc = PokemonStore.toDocument(entry);

        assertThat(doc.keySet()).containsExactly(
                "id", "name", "species_description", "types", "abilities", "sprites");
        assertThat(doc.getList("abilities", Document.class).get(0).keySet())
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
