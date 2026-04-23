package com.pokemon.model;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "pokemon")
public class PokeboxEntry {
    @Id
    private String id;
    private Long pokemonId;
    private String name;
    private String speciesDescription;
    private List<String> types;
    private List<PokemonAbility> abilities;
    private JsonNode sprites;
}
