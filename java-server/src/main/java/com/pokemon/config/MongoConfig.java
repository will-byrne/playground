package com.pokemon.config;

import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    /**
     * Fail queries after 5s when MongoDB is unreachable (the driver default is
     * 30s), so requests answer 500 promptly. Same value in every server.
     */
    @Bean
    public MongoClientSettingsBuilderCustomizer serverSelectionTimeout() {
        return settings -> settings.applyToClusterSettings(
                cluster -> cluster.serverSelectionTimeout(5, TimeUnit.SECONDS));
    }
}
