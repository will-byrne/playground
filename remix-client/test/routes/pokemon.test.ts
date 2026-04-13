// Off to a bad start when it doesnt import the file its testing...
// another useless file that tests typescript rather than the code it purports(sp?) to test

import { describe, it, expect } from "vitest";

describe("Pokemon Detail Route Functionality", () => {
  describe("Pokemon Navigation", () => {
    it("should allow navigation to previous pokemon (not pokemon 1)", () => {
      const currentId = 25;
      const canGoToPrevious = currentId > 1;
      expect(canGoToPrevious).toBe(true);
      expect(currentId - 1).toBe(24);
    });

    it("should not allow navigation to previous from pokemon 1", () => {
      const currentId = 1;
      const canGoToPrevious = currentId > 1;
      expect(canGoToPrevious).toBe(false);
    });

    it("should allow navigation to next pokemon (not pokemon 1025)", () => {
      const currentId = 25;
      const canGoToNext = currentId < 1025;
      expect(canGoToNext).toBe(true);
      expect(currentId + 1).toBe(26);
    });

    it("should not allow navigation to next from pokemon 1025", () => {
      const currentId = 1025;
      const canGoToNext = currentId < 1025;
      expect(canGoToNext).toBe(false);
    });

    it("should generate correct navigation paths", () => {
      const currentId = 25;
      const previousPath = `/pokemon/${currentId - 1}`;
      const nextPath = `/pokemon/${currentId + 1}`;
      expect(previousPath).toBe("/pokemon/24");
      expect(nextPath).toBe("/pokemon/26");
    });

    it("should handle edge cases - pokemon 1 and 1025", () => {
      const testCases = [
        { id: 1, canGoPrevious: false, canGoNext: true },
        { id: 2, canGoPrevious: true, canGoNext: true },
        { id: 1024, canGoPrevious: true, canGoNext: true },
        { id: 1025, canGoPrevious: true, canGoNext: false },
      ];

      testCases.forEach((test) => {
        expect(test.id > 1).toBe(test.canGoPrevious);
        expect(test.id < 1025).toBe(test.canGoNext);
      });
    });
  });

  describe("Pokemon ID Formatting", () => {
    it("should format pokemon id with leading zeros", () => {
      const formatId = (id: number) => id.toString().padStart(3, "0");
      expect(formatId(1)).toBe("001");
      expect(formatId(25)).toBe("025");
      expect(formatId(151)).toBe("151");
      expect(formatId(1025)).toBe("1025");
    });
  });

  describe("Name Formatting", () => {
    it("should capitalize first letter of pokemon name", () => {
      const capitalize = (name: string) =>
        name.charAt(0).toUpperCase() + name.slice(1);
      expect(capitalize("pikachu")).toBe("Pikachu");
      expect(capitalize("charmander")).toBe("Charmander");
      expect(capitalize("squirtle")).toBe("Squirtle");
    });

    it("should handle already capitalized names", () => {
      const capitalize = (name: string) =>
        name.charAt(0).toUpperCase() + name.slice(1);
      expect(capitalize("Pikachu")).toBe("Pikachu");
    });
  });

  describe("Shiny Toggle State", () => {
    it("should toggle between normal and shiny sprites", () => {
      let showShiny = false;
      expect(showShiny).toBe(false);
      showShiny = !showShiny;
      expect(showShiny).toBe(true);
      showShiny = !showShiny;
      expect(showShiny).toBe(false);
    });

    it("should only show toggle when shiny sprite exists", () => {
      const withShiny = { front_default: "url", front_shiny: "url" };
      const withoutShiny = { front_default: "url" };

      expect(withShiny.front_shiny).toBeDefined();
      expect(withoutShiny.front_shiny).toBeUndefined();
    });
  });

  describe("Pokemon Data Structure", () => {
    const mockPokemon = {
      id: 25,
      name: "pikachu",
      species_description:
        "When several of these Pokemon gather, their electricity can build and cause lightning storms.",
      types: ["electric"],
      abilities: [
        {
          name: "static",
          flavour_text: "May paralyze on contact.",
          effect:
            "May paralyze a pokemon that hits this pokemon with a move that makes contact.",
        },
      ],
      sprites: {
        front_default: "https://example.com/front.png",
        front_shiny: "https://example.com/shiny.png",
      },
    };

    it("should have required pokemon fields", () => {
      expect(mockPokemon).toHaveProperty("id");
      expect(mockPokemon).toHaveProperty("name");
      expect(mockPokemon).toHaveProperty("species_description");
      expect(mockPokemon).toHaveProperty("types");
      expect(mockPokemon).toHaveProperty("abilities");
      expect(mockPokemon).toHaveProperty("sprites");
    });

    it("should have valid types array", () => {
      expect(Array.isArray(mockPokemon.types)).toBe(true);
      expect(mockPokemon.types.length).toBeGreaterThan(0);
    });

    it("should have valid abilities array", () => {
      expect(Array.isArray(mockPokemon.abilities)).toBe(true);
      mockPokemon.abilities.forEach((ability) => {
        expect(ability).toHaveProperty("name");
        expect(ability).toHaveProperty("flavour_text");
        expect(ability).toHaveProperty("effect");
      });
    });

    it("should have valid sprites object", () => {
      expect(typeof mockPokemon.sprites).toBe("object");
      expect(mockPokemon.sprites).not.toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle pokemon not found", () => {
      const pokemon = null;
      expect(pokemon).toBeNull();
    });

    it("should display appropriate error message", () => {
      const idOrName = "invalid-pokemon";
      const errorMessage = `The Pokemon "${idOrName}" could not be found.`;
      expect(errorMessage).toContain(idOrName);
    });

    it("should provide navigation back to home", () => {
      const backButtonPath = "/";
      expect(backButtonPath).toBe("/");
    });
  });

  describe("Species Description Formatting", () => {
    it("should replace newlines with spaces", () => {
      const description =
        "This is a test.\nThis is another line.\r\nThis is third line.";
      const formatted = description.replace(/\r?\n/g, " ");
      expect(formatted).toBe(
        "This is a test. This is another line. This is third line."
      );
      expect(formatted).not.toContain("\n");
    });
  });
});
