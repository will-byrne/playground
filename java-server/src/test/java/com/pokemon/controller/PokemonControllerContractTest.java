package com.pokemon.controller;

import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import com.pokemon.model.PokemonAbility;
import com.pokemon.service.PokemonService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;

@WebFluxTest(PokemonController.class)
class PokemonControllerContractTest {

    @Autowired
    private WebTestClient client;

    @MockBean
    private PokemonService pokemonService;

    @Test
    void indexSaysHello() {
        client.get().uri("/").exchange()
                .expectStatus().isOk()
                .expectBody(String.class).isEqualTo("Hello, World!");
    }

    @Test
    void pokemonUsesTheSharedJsonShape() {
        when(pokemonService.getPokemonByIdOrName("1")).thenReturn(Mono.just(new PokeboxEntry(
                1, "bulbasaur", "A strange seed", List.of("grass"),
                List.of(new PokemonAbility("overgrow", "Ups GRASS moves", "Strengthens grass moves")),
                Map.of("front_default", "front.png"))));

        client.get().uri("/pokemon/1").exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.id").isEqualTo(1)
                .jsonPath("$.name").isEqualTo("bulbasaur")
                .jsonPath("$.species_description").isEqualTo("A strange seed")
                .jsonPath("$.types[0]").isEqualTo("grass")
                .jsonPath("$.abilities[0].flavour_text").isEqualTo("Ups GRASS moves")
                .jsonPath("$.abilities[0].effect").isEqualTo("Strengthens grass moves")
                .jsonPath("$.sprites.front_default").isEqualTo("front.png")
                .jsonPath("$.speciesDescription").doesNotExist()
                .jsonPath("$.pokemonId").doesNotExist();
    }

    @Test
    void unknownPokemonIs404() {
        when(pokemonService.getPokemonByIdOrName("missingno")).thenReturn(Mono.empty());

        client.get().uri("/pokemon/missingno").exchange().expectStatus().isNotFound();
    }

    @Test
    void randomNewFailureIs500() {
        when(pokemonService.getRandomNewPokemon()).thenReturn(Mono.empty());

        client.get().uri("/pokemon/random-new").exchange().expectStatus().is5xxServerError();
    }

    @Test
    void pokedexListsIdAndName() {
        when(pokemonService.getPokedex()).thenReturn(Flux.just(new PokedexEntry(4, "charmander")));

        client.get().uri("/pokedex").exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.length()").isEqualTo(1)
                .jsonPath("$[0].id").isEqualTo(4)
                .jsonPath("$[0].name").isEqualTo("charmander");
    }

    @Test
    void everyResponseHasRustServerCorsHeaders() {
        client.get().uri("/").exchange()
                .expectHeader().valueEquals("Access-Control-Allow-Origin", "*")
                .expectHeader().valueEquals("Access-Control-Allow-Methods", "POST, PATCH, GET, DELETE, OPTIONS")
                .expectHeader().valueEquals("Access-Control-Allow-Headers", "*")
                .expectHeader().valueEquals("Access-Control-Allow-Credentials", "true");
    }

    @Test
    void optionsOnAnyPathIs204() {
        client.options().uri("/anything/at/all").exchange().expectStatus().isNoContent();
    }
}
