package com.pokemon.service;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Projections;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoCollection;
import com.pokemon.model.PokeboxEntry;
import com.pokemon.model.PokedexEntry;
import com.pokemon.model.PokemonAbility;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Reads and writes the shared `pokemon.pokemon` collection with the raw driver,
 * using the same field names as the other servers (`id`, `species_description`,
 * `flavour_text`). Spring Data's object mapping is avoided on purpose: it maps
 * a property called `id` onto Mongo's `_id`.
 */
@Slf4j
@Component
public class PokemonStore {

    private final MongoCollection<Document> collection;

    public PokemonStore(MongoClient mongoClient) {
        this.collection = mongoClient.getDatabase("pokemon").getCollection("pokemon");
    }

    public Flux<PokedexEntry> findPokedex() {
        return Flux.from(collection.find(Filters.exists("id"))
                        .projection(Projections.fields(Projections.include("id", "name"), Projections.excludeId())))
                .filter(doc -> doc.get("id") instanceof Number && doc.get("name") instanceof String)
                .map(doc -> new PokedexEntry(((Number) doc.get("id")).longValue(), doc.getString("name")));
    }

    public Mono<PokeboxEntry> findById(long id) {
        return findOne(Filters.eq("id", id));
    }

    public Mono<PokeboxEntry> findByName(String name) {
        return findOne(Filters.eq("name", name));
    }

    public Mono<Void> save(PokeboxEntry entry) {
        return Mono.from(collection.insertOne(toDocument(entry)))
                .doOnError(error -> log.error("Error saving Pokemon {}", entry.name(), error))
                .onErrorResume(error -> Mono.empty())
                .then();
    }

    private Mono<PokeboxEntry> findOne(Bson filter) {
        return Mono.from(collection.find(filter).projection(Projections.excludeId()).first())
                .map(PokemonStore::fromDocument);
    }

    static Document toDocument(PokeboxEntry entry) {
        List<Document> abilities = entry.abilities().stream()
                .map(ability -> new Document("name", ability.name())
                        .append("flavour_text", ability.flavourText())
                        .append("effect", ability.effect()))
                .toList();
        return new Document("id", entry.id())
                .append("name", entry.name())
                .append("species_description", entry.speciesDescription())
                .append("types", entry.types())
                .append("abilities", abilities)
                .append("sprites", entry.sprites());
    }

    static PokeboxEntry fromDocument(Document doc) {
        List<PokemonAbility> abilities = doc.getList("abilities", Document.class, List.of()).stream()
                .map(ability -> new PokemonAbility(
                        ability.getString("name"),
                        ability.getString("flavour_text"),
                        ability.getString("effect")))
                .toList();
        return new PokeboxEntry(
                ((Number) doc.get("id")).longValue(),
                doc.getString("name"),
                doc.getString("species_description"),
                doc.getList("types", String.class, List.of()),
                abilities,
                doc.get("sprites"));
    }
}
