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

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

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

    /** Longest id or name {@code /pokemon/{idOrName}} accepts. Real names top out around 25 characters. */
    static final int MAX_IDENTIFIER_LEN = 64;

    private static final Pattern IDENTIFIER = Pattern.compile("[a-z0-9-]{1," + MAX_IDENTIFIER_LEN + "}");

    /**
     * {@code idOrName} lowercased, if it can name a Pokémon: 1 to
     * MAX_IDENTIFIER_LEN of a-z, 0-9 and {@code -}. Anything else can't exist,
     * so it's answered 404 without asking PokeAPI (which rejects odd names
     * with a 403 that would otherwise surface as a 502). Same rule as
     * rust-server.
     */
    static Optional<String> normalizeIdentifier(String idOrName) {
        String key = idOrName.strip().toLowerCase(Locale.ROOT);
        return IDENTIFIER.matcher(key).matches() ? Optional.of(key) : Optional.empty();
    }

    /** 404 for an unknown Pokémon, 502 when PokeAPI fails, 500 when MongoDB fails. */
    @GetMapping("/pokemon/{idOrName}")
    public Mono<ResponseEntity<PokeboxEntry>> getPokemon(@PathVariable String idOrName) {
        Optional<String> key = normalizeIdentifier(idOrName);
        if (key.isEmpty()) {
            return Mono.just(ResponseEntity.notFound().build());
        }
        return pokemonService.getPokemonByIdOrName(key.get())
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/pokedex")
    public Flux<PokedexEntry> getPokedex() {
        return pokemonService.getPokedex();
    }
}
