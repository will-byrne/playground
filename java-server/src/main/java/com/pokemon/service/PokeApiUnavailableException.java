package com.pokemon.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * PokeAPI was unreachable, failed, or sent something unexpected. Answered with
 * 502 Bad Gateway, like rust-server, so it isn't mistaken for a missing
 * Pokémon (404) or a database failure (500).
 */
public class PokeApiUnavailableException extends ResponseStatusException {

    public PokeApiUnavailableException(String idOrName, Throwable cause) {
        super(HttpStatus.BAD_GATEWAY, "PokeAPI failed for Pokemon " + idOrName, cause);
    }
}
