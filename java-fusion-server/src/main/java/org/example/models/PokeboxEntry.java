package org.example.models;

import com.fasterxml.jackson.databind.JsonNode;

public class PokeboxEntry {
  private int id;
  private String name;
  private String species_description;
  private String[] types;
  private JsonNode sprites;
  private Ability[] abilities;

  public int getId() {
    return id;
  }

  public void setId(int id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSpecies_description() {
    return species_description;
  }

  public void setSpecies_description(String species_description) {
    this.species_description = species_description;
  }

  public String[] getTypes() {
    return types;
  }

  public void setTypes(String[] types) {
    this.types = types;
  }

  public JsonNode getSprites() {
    return sprites;
  }

  public void setSprites(JsonNode sprites) {
    this.sprites = sprites;
  }

  public Ability[] getAbilities() {
    return abilities;
  }

  public void setAbilities(Ability[] abilities) {
    this.abilities = abilities;
  }

  public PokeboxEntry(int id, String name, String species_description, String[] types, JsonNode sprites, Ability[] abilities) {
    this.id = id;
    this.name = name;
    this.species_description = species_description;
    this.types = types;
    this.sprites = sprites;
    this.abilities = abilities;
  }
}

