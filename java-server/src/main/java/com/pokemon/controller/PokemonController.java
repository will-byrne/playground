package com.pokemon.controller;

import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import com.pokemon.service.PokemonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
public class PokemonController {

    private final PokemonService pokemonService;

    @GetMapping("/")
    public Mono<String> index() {
        return Mono.just("Hello, World!");
    }

    /**
     * Error statuses match rust-server: 404 once every Pokémon is stored,
     * 502 when PokeAPI fails, 500 when MongoDB fails.
     */
    @GetMapping("/pokemon/random-new")
    public Mono<ResponseEntity<PokeboxEntry>> getRandomNewPokemon() {
        return pokemonService.getRandomNewPokemon()
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    /** 404 for an unknown Pokémon, 502 when PokeAPI fails, 500 when MongoDB fails. */
    @GetMapping("/pokemon/{idOrName}")
    public Mono<ResponseEntity<PokeboxEntry>> getPokemon(@PathVariable String idOrName) {
        return pokemonService.getPokemonByIdOrName(idOrName)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/pokedex")
    public Flux<PokedexEntry> getPokedex() {
        return pokemonService.getPokedex();
    }
}
