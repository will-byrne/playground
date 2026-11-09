package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class PokemonService {

    static final int DEX_MAX = 1025;

    private final PokemonStore store;
    private final WebClient pokeApiClient;

    public Flux<PokedexEntry> getPokedex() {
        return store.findPokedex();
    }

    /** Matches rust-server: an optionally signed integer is an id, anything else is a name. */
    public Mono<PokeboxEntry> getPokemonByIdOrName(String idOrName) {
        if (idOrName.matches("[+-]?\\d+")) {
            try {
                return getPokemonById(Long.parseLong(idOrName));
            } catch (NumberFormatException e) {
                return Mono.empty();
            }
        }
        return getPokemonByName(idOrName.toLowerCase(Locale.ROOT));
    }

    public Mono<PokeboxEntry> getPokemonById(long id) {
        if (id <= 0) {
            return Mono.empty();
        }
        return store.findById(id).switchIfEmpty(Mono.defer(() -> fetchAndStore(String.valueOf(id))));
    }

    public Mono<PokeboxEntry> getPokemonByName(String name) {
        return store.findByName(name).switchIfEmpty(Mono.defer(() -> fetchAndStore(name)));
    }

    public Mono<PokeboxEntry> getRandomNewPokemon() {
        return store.findPokedex()
                .map(PokedexEntry::id)
                .collect(Collectors.toSet())
                .flatMap(seen -> randomUnseenId(seen).map(this::getPokemonById).orElseGet(Mono::empty));
    }

    static java.util.Optional<Long> randomUnseenId(Set<Long> seen) {
        List<Long> unseen = LongStream.rangeClosed(1, DEX_MAX).filter(id -> !seen.contains(id)).boxed().toList();
        if (unseen.isEmpty()) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(unseen.get(ThreadLocalRandom.current().nextInt(unseen.size())));
    }

    /**
     * Fetches a Pokémon and its species' other forms from PokeAPI and stores
     * it. Empty when PokeAPI has no such Pokémon (404); fails with
     * {@link PokeApiUnavailableException} (502) for any other PokeAPI failure,
     * including a 404 for its species.
     */
    private Mono<PokeboxEntry> fetchAndStore(String idOrName) {
        return fetch("/pokemon/{idOrName}", idOrName)
                .onErrorResume(WebClientResponseException.NotFound.class, notFound -> {
                    log.info("PokeAPI has no Pokemon {}", idOrName);
                    return Mono.empty();
                })
                .flatMap(pokemon -> Mono.zip(
                                fetch("/pokemon-species/{name}", pokemon.path("species").path("name").asText()),
                                fetchExtras(pokemon))
                        .flatMap(both -> fetchVarieties(pokemon, both.getT1())
                                .map(varieties -> PokeApiMapper.toPokeboxEntry(both.getT2(), both.getT1(), varieties))))
                .onErrorMap(error -> {
                    log.error("Failed to fetch Pokemon {} from PokeAPI", idOrName, error);
                    return new PokeApiUnavailableException(idOrName, error);
                })
                // A failed save is logged by the store; the lookup still succeeds.
                .flatMap(entry -> store.save(entry).thenReturn(entry));
    }

    /**
     * The species' varieties other than {@code pokemon}, in order. A variety
     * PokeAPI doesn't have is skipped; any other failure fails the lookup, so
     * an entry missing forms is never stored.
     */
    private Mono<List<PokeApiMapper.FetchedPokemon>> fetchVarieties(JsonNode pokemon, JsonNode species) {
        String self = pokemon.path("name").asText();
        return Flux.fromIterable(species.path("varieties"))
                .map(variety -> variety.path("pokemon").path("name").asText())
                .filter(name -> !name.isEmpty() && !name.equals(self))
                .flatMapSequential(name -> fetch("/pokemon/{name}", name)
                        .flatMap(this::fetchExtras)
                        .onErrorResume(WebClientResponseException.NotFound.class, notFound -> {
                            log.warn("Variety {} not found, skipping it", name);
                            return Mono.empty();
                        }))
                .collectList();
    }

    /** The abilities and form text that go with one {@code pokemon} resource. */
    private Mono<PokeApiMapper.FetchedPokemon> fetchExtras(JsonNode pokemon) {
        return Mono.zip(fetchAbilities(pokemon), fetchForm(pokemon),
                (abilities, form) -> new PokeApiMapper.FetchedPokemon(pokemon, abilities, form));
    }

    /** The Pokémon's first {@code pokemon-form}; a missing one just means no form text. */
    private Mono<JsonNode> fetchForm(JsonNode pokemon) {
        String name = pokemon.path("forms").path(0).path("name").asText();
        if (name.isEmpty()) {
            return Mono.just(MissingNode.getInstance());
        }
        return fetch("/pokemon-form/{name}", name)
                .onErrorResume(WebClientResponseException.NotFound.class,
                        notFound -> Mono.just(MissingNode.getInstance()));
    }

    /** Abilities that fail to load are skipped, as in rust-server. */
    private Mono<List<JsonNode>> fetchAbilities(JsonNode pokemon) {
        return Flux.fromIterable(pokemon.path("abilities"))
                .map(slot -> slot.path("ability").path("name").asText())
                .filter(name -> !name.isEmpty())
                .flatMapSequential(name -> fetch("/ability/{name}", name).onErrorResume(error -> {
                    log.warn("Failed to fetch ability {}", name, error);
                    return Mono.empty();
                }))
                .collectList();
    }

    private Mono<JsonNode> fetch(String path, String param) {
        return pokeApiClient.get().uri(path, param).retrieve().bodyToMono(JsonNode.class);
    }
}
