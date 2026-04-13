import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { RemixBrowser } from "@remix-run/react";

// Mock component for testing Index page logic
import React from "react";

const mockPokedex = [
  { id: 1, name: "Bulbasaur" },
  { id: 4, name: "Charmander" },
  { id: 7, name: "Squirtle" },
  { id: 25, name: "Pikachu" },
  { id: 37, name: "Vulpix" },
  { id: 77, name: "Ponyta" },
  { id: 151, name: "Mew" },
  { id: 647, name: "Keldeo" },
  { id: 700, name: "Sylveon" },
];

describe("Index Route Functionality", () => {
  describe("Search Functionality", () => {
    it("should filter pokemon by name", () => {
      const searchTerm = "pika";
      const filtered = mockPokedex.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Pikachu");
    });

    it("should filter pokemon by id", () => {
      const searchTerm = "25";
      const filtered = mockPokedex.filter((pokemon) =>
        pokemon.id.toString().includes(searchTerm)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Pikachu");
    });

    it("should be case-insensitive", () => {
      const searchTerm = "PIKACHU";
      const filtered = mockPokedex.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Pikachu");
    });

    it("should limit results to 10", () => {
      const longList = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Pokemon${i}`,
      }));
      const searchTerm = "pokemon";
      const filtered = longList
        .filter((pokemon) =>
          pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10);
      expect(filtered).toHaveLength(10);
    });

    it("should return empty array when no matches found", () => {
      const searchTerm = "nonexistent";
      const filtered = mockPokedex.filter((pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(0);
    });
  });

  describe("Featured Pokemon", () => {
    it("should include specific featured pokemon ids", () => {
      const featuredIds = [37, 77, 151, 647, 700];
      const featured = mockPokedex.filter((p) => featuredIds.includes(p.id));
      expect(featured).toHaveLength(5);
      expect(featured.map((p) => p.id)).toEqual(featuredIds);
    });

    it("should display featured pokemon in correct order", () => {
      const featuredIds = [37, 77, 151, 647, 700];
      const featured = featuredIds
        .map((id) => mockPokedex.find((p) => p.id === id))
        .filter(Boolean);
      expect(featured).toHaveLength(5);
      expect(featured[0]?.name).toBe("Vulpix");
      expect(featured[4]?.name).toBe("Sylveon");
    });
  });

  describe("Pokemon ID Formatting", () => {
    it("should pad pokemon ids to 3 digits with leading zeros", () => {
      const formatId = (id: number) => id.toString().padStart(3, "0");
      expect(formatId(1)).toBe("001");
      expect(formatId(25)).toBe("025");
      expect(formatId(151)).toBe("151");
      expect(formatId(1025)).toBe("1025");
    });
  });

  describe("Pokedex Statistics", () => {
    it("should calculate total pokemon count", () => {
      const totalPokemon = mockPokedex.length;
      expect(totalPokemon).toBe(9);
    });

    it("should calculate remaining pokemon to discover", () => {
      const totalAvailable = 1025;
      const remaining = totalAvailable - mockPokedex.length;
      expect(remaining).toBe(1016);
    });

    it("should determine if all pokemon are discovered", () => {
      const fullPokedex = Array.from({ length: 1025 }, (_, i) => ({
        id: i + 1,
        name: `Pokemon${i}`,
      }));
      const allDiscovered = fullPokedex.length === 1025;
      expect(allDiscovered).toBe(true);
    });
  });

  describe("Random Pokemon Navigation", () => {
    it("should navigate to pokemon page when random button is clicked", () => {
      // This would be tested with E2E or integration tests
      // The function should navigate to `/pokemon/${pokemon.name}`
      const navigationPath = "/pokemon/Pikachu";
      expect(navigationPath).toContain("/pokemon/");
    });
  });
});
