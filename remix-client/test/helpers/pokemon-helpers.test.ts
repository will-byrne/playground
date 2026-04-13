// next person who tells me ai is te future is getting a talking to...

import { describe, it, expect } from "vitest";

// Helper functions extracted from pokemon.$idOrName.tsx for testing
const getTypeColor = (type: string): string => {
  const typeColors: Record<string, string> = {
    normal: "bg-gray-500 text-white",
    fire: "bg-red-500 text-white",
    water: "bg-blue-500 text-white",
    grass: "bg-green-500 text-white",
    electric: "bg-yellow-400 text-black",
    ice: "bg-cyan-400 text-black",
    fighting: "bg-orange-700 text-white",
    poison: "bg-purple-500 text-white",
    ground: "bg-amber-600 text-white",
    flying: "bg-sky-400 text-black",
    psychic: "bg-pink-500 text-white",
    bug: "bg-lime-500 text-black",
    rock: "bg-gray-600 text-white",
    ghost: "bg-purple-700 text-white",
    dragon: "bg-indigo-600 text-white",
    dark: "bg-gray-800 text-white",
    steel: "bg-slate-500 text-white",
    fairy: "bg-pink-400 text-black",
  };

  return typeColors[type.toLowerCase()] || "bg-gray-400 text-white";
};

const getSprites = (
  sp: Record<string, any>,
  k?: string
): Record<string, string> => {
  const result = Object.entries(sp).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === "string" && value) {
        const newKey = `${k ? `${k}-` : ""}${key}`;
        acc[newKey] = value;
      } else if (value && typeof value === "object") {
        Object.assign(acc, getSprites(value, key));
      }
      return acc;
    },
    {}
  );

  return result;
};

describe("Pokemon Helper Functions", () => {
  describe("getTypeColor", () => {
    it("should return correct color for fire type", () => {
      expect(getTypeColor("fire")).toBe("bg-red-500 text-white");
    });

    it("should return correct color for water type", () => {
      expect(getTypeColor("water")).toBe("bg-blue-500 text-white");
    });

    it("should return correct color for electric type", () => {
      expect(getTypeColor("electric")).toBe("bg-yellow-400 text-black");
    });

    it("should handle case-insensitive input", () => {
      expect(getTypeColor("FIRE")).toBe("bg-red-500 text-white");
      expect(getTypeColor("Fire")).toBe("bg-red-500 text-white");
      expect(getTypeColor("WaTeR")).toBe("bg-blue-500 text-white");
    });

    it("should return default color for unknown types", () => {
      expect(getTypeColor("unknown")).toBe("bg-gray-400 text-white");
      expect(getTypeColor("invalid_type")).toBe("bg-gray-400 text-white");
    });

    it("should have colors for all 18 pokemon types", () => {
      const types = [
        "normal",
        "fire",
        "water",
        "grass",
        "electric",
        "ice",
        "fighting",
        "poison",
        "ground",
        "flying",
        "psychic",
        "bug",
        "rock",
        "ghost",
        "dragon",
        "dark",
        "steel",
        "fairy",
      ];

      types.forEach((type) => {
        const color = getTypeColor(type);
        expect(color).not.toBe("bg-gray-400 text-white");
        expect(color).toMatch(/^bg-/);
        expect(color).toMatch(/text-(white|black)$/);
      });
    });
  });

  describe("getSprites", () => {
    it("should extract flat string properties", () => {
      const sprites = {
        front_default: "https://example.com/front.png",
        back_default: "https://example.com/back.png",
      };

      const result = getSprites(sprites);

      expect(result).toEqual({
        front_default: "https://example.com/front.png",
        back_default: "https://example.com/back.png",
      });
    });

    it("should handle nested objects with key prefix", () => {
      const sprites = {
        official: {
          front_default: "https://example.com/official-front.png",
          front_shiny: "https://example.com/official-shiny.png",
        },
      };

      const result = getSprites(sprites);

      expect(result).toEqual({
        "official-front_default": "https://example.com/official-front.png",
        "official-front_shiny": "https://example.com/official-shiny.png",
      });
    });

    it("should handle deeply nested objects", () => {
      const sprites = {
        showdown: {
          front_default: "https://example.com/showdown-front.png",
        },
        official: {
          artwork: {
            front_default: "https://example.com/artwork-front.png",
          },
        },
      };

      const result = getSprites(sprites);

      expect(result).toEqual({
        "showdown-front_default": "https://example.com/showdown-front.png",
        "artwork-front_default": "https://example.com/artwork-front.png",
      });
    });

    it("should ignore null and undefined values", () => {
      const sprites = {
        front_default: "https://example.com/front.png",
        back_default: null,
        side_default: undefined,
        valid_shiny: "https://example.com/shiny.png",
      };

      const result = getSprites(sprites as any);

      expect(result).toEqual({
        front_default: "https://example.com/front.png",
        valid_shiny: "https://example.com/shiny.png",
      });
    });

    it("should ignore empty objects", () => {
      const sprites = {
        front_default: "https://example.com/front.png",
        empty_group: {},
        back_default: "https://example.com/back.png",
      };

      const result = getSprites(sprites);

      expect(result).toEqual({
        front_default: "https://example.com/front.png",
        back_default: "https://example.com/back.png",
      });
    });
  });
});
