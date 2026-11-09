package com.pokemon.service;

import com.mongodb.MongoTimeoutException;
import com.pokemon.model.PokedexEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.net.ConnectException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * How PokemonService reports failures, so the controller can answer with the
 * same statuses as rust-server: empty (404) for a Pokémon PokeAPI doesn't
 * have, PokeApiUnavailableException (502) for any other PokeAPI failure, and
 * the store's own error (500) when MongoDB fails.
 */
class PokemonServiceErrorTest {

    private static final String BULBASAUR = """
            {"id": 1, "name": "bulbasaur", "species": {"name": "bulbasaur"},
             "types": [{"type": {"name": "grass"}}], "abilities": [], "sprites": {"front_default": "f.png"}}""";
    private static final String SPECIES = """
            {"flavor_text_entries": [{"flavor_text": "A strange seed", "language": {"name": "en"}}]}""";

    private static final String VULPIX = """
            {"id": 37, "name": "vulpix", "species": {"name": "vulpix"}, "forms": [{"name": "vulpix"}],
             "types": [{"type": {"name": "fire"}}], "abilities": [], "sprites": {"front_default": "37.png"}}""";
    private static final String ALOLAN_VULPIX = """
            {"id": 10103, "name": "vulpix-alola", "species": {"name": "vulpix"}, "forms": [{"name": "vulpix-alola"}],
             "types": [{"type": {"name": "ice"}}], "abilities": [{"ability": {"name": "snow-cloak"}}],
             "sprites": {"front_default": "10103.png"}}""";
    private static final String VULPIX_SPECIES = """
            {"flavor_text_entries": [{"flavor_text": "Fire fox", "language": {"name": "en"}}],
             "varieties": [{"is_default": true, "pokemon": {"name": "vulpix"}},
                           {"is_default": false, "pokemon": {"name": "vulpix-alola"}}]}""";
    private static final String ALOLAN_FORM = """
            {"form_names": [{"name": "Alolan Form", "language": {"name": "en"}}],
             "flavor_text_entries": [{"flavor_text": "Ice fox", "language": {"name": "en"}}]}""";
    private static final String SNOW_CLOAK = """
            {"name": "snow-cloak", "flavor_text_entries": [], "effect_entries": []}""";

    private void serveVulpix() {
        pokeApi.put("/pokemon/vulpix", json(VULPIX));
        pokeApi.put("/pokemon/vulpix-alola", json(ALOLAN_VULPIX));
        pokeApi.put("/pokemon-species/vulpix", json(VULPIX_SPECIES));
        pokeApi.put("/pokemon-form/vulpix-alola", json(ALOLAN_FORM));
        pokeApi.put("/ability/snow-cloak", json(SNOW_CLOAK));
    }

    /** PokeAPI responses by path; anything missing is a 404. */
    private final Map<String, Mono<ClientResponse>> pokeApi = new HashMap<>();
    private PokemonStore store;
    private PokemonService service;

    @BeforeEach
    void setUp() {
        store = mock(PokemonStore.class);
        when(store.findById(any(Long.class))).thenReturn(Mono.empty());
        when(store.findByName(any())).thenReturn(Mono.empty());
        when(store.save(any())).thenReturn(Mono.empty());
        when(store.findPokedex()).thenReturn(Flux.empty());

        WebClient client = WebClient.builder()
                .baseUrl("https://pokeapi.test/api/v2")
                .exchangeFunction(request -> pokeApi.getOrDefault(
                        request.url().getPath().replace("/api/v2", ""),
                        Mono.just(ClientResponse.create(HttpStatus.NOT_FOUND).build())))
                .build();
        service = new PokemonService(store, client);
    }

    private static Mono<ClientResponse> json(String body) {
        return Mono.just(ClientResponse.create(HttpStatus.OK)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(body)
                .build());
    }

    private static Mono<ClientResponse> status(HttpStatus status) {
        return Mono.just(ClientResponse.create(status).build());
    }

    private static Mono<ClientResponse> unreachable() {
        return Mono.error(new WebClientRequestException(new ConnectException("Connection refused"),
                HttpMethod.GET, URI.create("https://pokeapi.test"), new HttpHeaders()));
    }

    @Test
    void returnsAndStoresAPokemonPokeApiHas() {
        pokeApi.put("/pokemon/1", json(BULBASAUR));
        pokeApi.put("/pokemon-species/bulbasaur", json(SPECIES));

        StepVerifier.create(service.getPokemonByIdOrName("1"))
                .assertNext(entry -> {
                    assertThat(entry.name()).isEqualTo("bulbasaur");
                    assertThat(entry.speciesDescription()).isEqualTo("A strange seed");
                })
                .verifyComplete();
    }

    @Test
    void fetchesTheOtherFormsOfTheSpecies() {
        serveVulpix();

        StepVerifier.create(service.getPokemonByIdOrName("vulpix"))
                .assertNext(entry -> {
                    assertThat(entry.speciesDescription()).isEqualTo("Fire fox");
                    assertThat(entry.varieties()).singleElement().satisfies(alola -> {
                        assertThat(alola.id()).isEqualTo(10103);
                        assertThat(alola.formName()).isEqualTo("Alolan Form");
                        assertThat(alola.speciesDescription()).isEqualTo("Ice fox");
                        assertThat(alola.types()).containsExactly("ice");
                        assertThat(alola.abilities()).extracting(a -> a.name()).containsExactly("snow-cloak");
                    });
                })
                .verifyComplete();
    }

    @Test
    void aVarietyPokeApiDoesNotHaveIsSkipped() {
        serveVulpix();
        pokeApi.remove("/pokemon/vulpix-alola");

        StepVerifier.create(service.getPokemonByIdOrName("vulpix"))
                .assertNext(entry -> assertThat(entry.varieties()).isEmpty())
                .verifyComplete();
    }

    @Test
    void aFailingVarietyIsUnavailableAndNothingIsStored() {
        serveVulpix();
        pokeApi.put("/pokemon/vulpix-alola", status(HttpStatus.SERVICE_UNAVAILABLE));

        StepVerifier.create(service.getPokemonByIdOrName("vulpix"))
                .expectError(PokeApiUnavailableException.class)
                .verify();
        verify(store, never()).save(any());
    }

    @Test
    void aMissingFormJustMeansNoFormText() {
        serveVulpix();
        pokeApi.remove("/pokemon-form/vulpix-alola");

        StepVerifier.create(service.getPokemonByIdOrName("vulpix-alola"))
                .assertNext(entry -> {
                    assertThat(entry.formName()).isEmpty();
                    assertThat(entry.speciesDescription()).isEqualTo("Fire fox");
                })
                .verifyComplete();
    }

    @Test
    void aPokemonPokeApiDoesNotHaveIsEmpty() {
        StepVerifier.create(service.getPokemonByIdOrName("missingno")).verifyComplete();
        StepVerifier.create(service.getPokemonByIdOrName("99999")).verifyComplete();
        StepVerifier.create(service.getPokemonByIdOrName("0")).verifyComplete();
    }

    @Test
    void aPokeApiServerErrorIsUnavailable() {
        pokeApi.put("/pokemon/1", status(HttpStatus.SERVICE_UNAVAILABLE));

        StepVerifier.create(service.getPokemonByIdOrName("1"))
                .expectError(PokeApiUnavailableException.class)
                .verify();
    }

    @Test
    void anUnreachablePokeApiIsUnavailable() {
        pokeApi.put("/pokemon/1", unreachable());

        StepVerifier.create(service.getPokemonByIdOrName("1"))
                .expectError(PokeApiUnavailableException.class)
                .verify();
    }

    @Test
    void aMissingSpeciesIsUnavailableNotNotFound() {
        // The Pokémon exists, so a 404 further along is PokeAPI misbehaving.
        pokeApi.put("/pokemon/1", json(BULBASAUR));

        StepVerifier.create(service.getPokemonByIdOrName("1"))
                .expectError(PokeApiUnavailableException.class)
                .verify();
    }

    @Test
    void unavailableIsAnswered502() {
        assertThat(new PokeApiUnavailableException("1", new RuntimeException()).getStatusCode().value())
                .isEqualTo(502);
    }

    @Test
    void aDatabaseFailureIsPassedOnNotTreatedAsMissing() {
        when(store.findById(1L)).thenReturn(Mono.error(new MongoTimeoutException("down")));

        StepVerifier.create(service.getPokemonByIdOrName("1"))
                .expectError(MongoTimeoutException.class)
                .verify();
    }

    @Test
    void aFailedSaveStillReturnsThePokemon() {
        pokeApi.put("/pokemon/1", json(BULBASAUR));
        pokeApi.put("/pokemon-species/bulbasaur", json(SPECIES));
        // PokemonStore.save logs and swallows its own errors.
        when(store.save(any())).thenReturn(Mono.empty());

        StepVerifier.create(service.getPokemonByIdOrName("1")).expectNextCount(1).verifyComplete();
    }

    @Test
    void randomNewIsEmptyOnceEverythingIsStored() {
        when(store.findPokedex()).thenReturn(Flux.fromStream(
                LongStream.rangeClosed(1, PokemonService.DEX_MAX).mapToObj(id -> new PokedexEntry(id, "p" + id))));

        StepVerifier.create(service.getRandomNewPokemon()).verifyComplete();
    }

    @Test
    void randomNewPassesOnADatabaseFailure() {
        when(store.findPokedex()).thenReturn(Flux.error(new MongoTimeoutException("down")));

        StepVerifier.create(service.getRandomNewPokemon())
                .expectError(MongoTimeoutException.class)
                .verify();
    }

    @Test
    void randomNewReportsAnUnavailablePokeApi() {
        pokeApi.put("/pokemon/1", unreachable());
        when(store.findPokedex()).thenReturn(Flux.fromStream(
                LongStream.rangeClosed(2, PokemonService.DEX_MAX).mapToObj(id -> new PokedexEntry(id, "p" + id))));

        StepVerifier.create(service.getRandomNewPokemon())
                .expectError(PokeApiUnavailableException.class)
                .verify();
    }
}
