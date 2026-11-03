package com.pokemon.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    /** PokeAPI's /pokemon responses are ~280KB, above WebClient's default 256KB buffer. */
    private static final int MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

    @Bean
    public WebClient pokeApiClient() {
        return WebClient.builder()
                .baseUrl("https://pokeapi.co/api/v2")
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(MAX_RESPONSE_BYTES))
                .build();
    }
}
