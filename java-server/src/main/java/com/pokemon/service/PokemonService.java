package com.pokemon.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import com.pokemon.model.PokemonAbility;
import com.pokemon.repository.PokemonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PokemonService {
    
    private final PokemonRepository pokemonRepository;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;
    private final Random random = new Random();
    
    private static final String POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";
    
    /**
     * Get Pokemon Pokedex - list of all cached Pokemon with id and name
     */
    public Flux<PokedexEntry> getPokedex() {
        return pokemonRepository.findAll()
                .map(entry -> new PokedexEntry(entry.getPokemonId(), entry.getName()))
                .doOnError(error -> log.error("Error fetching pokedex", error));
    }
    
    /**
     * Get Pokemon by ID or name
     */
    public Mono<PokeboxEntry> getPokemonByIdOrName(String idOrName) {
        try {
            long id = Long.parseLong(idOrName);
            return getPokemonById(id);
        } catch (NumberFormatException e) {
            return getPokemonByName(idOrName);
        }
    }
    
    /**
     * Get Pokemon by ID
     */
    public Mono<PokeboxEntry> getPokemonById(long id) {
        return pokemonRepository.findByPokemonId(id)
                .switchIfEmpty(Mono.defer(() -> fetchAndCachePokemonById(id)));
    }
    
    /**
     * Get Pokemon by name
     */
    public Mono<PokeboxEntry> getPokemonByName(String name) {
        return pokemonRepository.findByNameIgnoreCase(name)
                .switchIfEmpty(Mono.defer(() -> fetchAndCachePokemonByName(name)));
    }
    
    /**
     * Get a random Pokemon that's not yet cached
     */
    public Mono<PokeboxEntry> getRandomNewPokemon() {
        return getPokedex()
                .map(PokedexEntry::getId)
                .collect(Collectors.toSet())
                .flatMap(cachedIds -> {
                    long randomId = generateRandomIdExcluding(cachedIds);
                    return fetchAndCachePokemonById(randomId);
                });
    }
    
    /**
     * Fetch Pokemon from PokeAPI and cache it
     */
    private Mono<PokeboxEntry> fetchAndCachePokemonById(long id) {
        return fetchPokemonDataById(id)
                .flatMap(this::savePokemon)
                .doOnError(error -> log.error("Error fetching Pokemon with id: {}", id, error));
    }
    
    /**
     * Fetch Pokemon from PokeAPI by name and cache it
     */
    private Mono<PokeboxEntry> fetchAndCachePokemonByName(String name) {
        return fetchPokemonDataByName(name)
                .flatMap(this::savePokemon)
                .doOnError(error -> log.error("Error fetching Pokemon with name: {}", name, error));
    }
    
    /**
     * Fetch Pokemon data from PokeAPI
     */
    private Mono<PokeboxEntry> fetchPokemonDataById(long id) {
        WebClient client = webClientBuilder.build();
        return client.get()
                .uri(POKEAPI_BASE_URL + "/pokemon/{id}", id)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(pokemonNode -> {
                    String name = pokemonNode.get("name").asText();
                    return client.get()
                            .uri(POKEAPI_BASE_URL + "/pokemon-species/{speciesName}", name)
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .map(speciesNode -> buildPokeboxEntry(pokemonNode, speciesNode, id));
                })
                .onErrorResume(error -> {
                    log.error("Failed to fetch pokemon {} from PokeAPI", id, error);
                    return Mono.empty();
                });
    }
    
    /**
     * Fetch Pokemon data from PokeAPI by name
     */
    private Mono<PokeboxEntry> fetchPokemonDataByName(String name) {
        WebClient client = webClientBuilder.build();
        return client.get()
                .uri(POKEAPI_BASE_URL + "/pokemon/{nameParam}", name.toLowerCase())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(pokemonNode -> {
                    long id = pokemonNode.get("id").asLong();
                    String speciesName = pokemonNode.get("species").get("name").asText();
                    return client.get()
                            .uri(POKEAPI_BASE_URL + "/pokemon-species/{speciesName}", speciesName)
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .map(speciesNode -> buildPokeboxEntry(pokemonNode, speciesNode, id));
                })
                .onErrorResume(error -> {
                    log.error("Failed to fetch pokemon {} from PokeAPI", name, error);
                    return Mono.empty();
                });
    }
    
    /**
     * Build PokeboxEntry from PokeAPI response
     */
    private PokeboxEntry buildPokeboxEntry(JsonNode pokemonNode, JsonNode speciesNode, long id) {
        PokeboxEntry entry = new PokeboxEntry();
        entry.setPokemonId(id);
        entry.setName(pokemonNode.get("name").asText());
        
        // Set species description
        JsonNode flavorText = speciesNode.get("flavor_text_entries").findPath("flavor_text");
        if (flavorText != null && !flavorText.isMissingNode()) {
            entry.setSpeciesDescription(flavorText.asText());
        } else {
            entry.setSpeciesDescription("No description available");
        }
        
        // Set types
        List<String> types = new ArrayList<>();
        pokemonNode.get("types").forEach(typeNode -> {
            types.add(typeNode.get("type").get("name").asText());
        });
        entry.setTypes(types);
        
        // Set abilities
        List<PokemonAbility> abilities = new ArrayList<>();
        pokemonNode.get("abilities").forEach(abilityNode -> {
            String abilityName = abilityNode.get("ability").get("name").asText();
            PokemonAbility ability = new PokemonAbility(abilityName, "No description available", "No effect available");
            abilities.add(ability);
        });
        entry.setAbilities(abilities);
        
        // Set sprites
        entry.setSprites(pokemonNode.get("sprites"));
        
        return entry;
    }
    
    /**
     * Save Pokemon to database
     */
    private Mono<PokeboxEntry> savePokemon(PokeboxEntry entry) {
        return pokemonRepository.save(entry)
                .doOnSuccess(saved -> log.info("Saved Pokemon: {}", saved.getName()))
                .doOnError(error -> log.error("Error saving Pokemon", error));
    }
    
    /**
     * Generate random Pokemon ID excluding cached ones
     */
    private long generateRandomIdExcluding(java.util.Set<Long> excludedIds) {
        long randomId;
        do {
            randomId = random.nextLong(1, 1026); // Pokédex has 1025 Pokemon
        } while (excludedIds.contains(randomId));
        return randomId;
    }
}
