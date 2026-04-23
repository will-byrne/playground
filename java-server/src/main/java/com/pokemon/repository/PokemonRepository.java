package com.pokemon.repository;

import com.pokemon.model.PokeboxEntry;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public interface PokemonRepository extends ReactiveMongoRepository<PokeboxEntry, String> {
    Mono<PokeboxEntry> findByPokemonId(Long pokemonId);
    Mono<PokeboxEntry> findByNameIgnoreCase(String name);
}
