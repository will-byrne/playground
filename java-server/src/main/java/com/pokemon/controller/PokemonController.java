package com.pokemon.controller;

import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import com.pokemon.service.PokemonService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PokemonController {
    
    private final PokemonService pokemonService;
    
    @GetMapping("/")
    public Mono<String> index() {
        return Mono.just("Hello, World!");
    }
    
    @GetMapping("/pokemon/random-new")
    public Mono<PokeboxEntry> getRandomNewPokemon() {
        return pokemonService.getRandomNewPokemon();
    }
    
    @GetMapping("/pokemon/{idOrName}")
    public Mono<PokeboxEntry> getPokemon(@PathVariable String idOrName) {
        return pokemonService.getPokemonByIdOrName(idOrName);
    }
    
    @GetMapping("/pokedex")
    public Flux<PokedexEntry> getPokedex() {
        return pokemonService.getPokedex();
    }
}
