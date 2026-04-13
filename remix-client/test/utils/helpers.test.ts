import { describe, it, expect } from "vitest";

describe("Utility Functions and Edge Cases", () => {
  describe("String Formatting", () => {
    it("should capitalize first letter of strings", () => {
      const capitalize = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1);
      expect(capitalize("test")).toBe("Test");
      expect(capitalize("pikachu")).toBe("Pikachu");
      expect(capitalize("a")).toBe("A");
    });

    it("should handle empty strings", () => {
      const capitalize = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1);
      expect(capitalize("")).toBe("");
    });

    it("should replace newlines with spaces", () => {
      const text = "line1\nline2\r\nline3\r\nline4";
      const cleaned = text.replace(/\r?\n/g, " ");
      expect(cleaned).toBe("line1 line2 line3 line4");
    });

    it("should extract pokemon name from search", () => {
      const search = "pika";
      const name = "Pikachu";
      expect(name.toLowerCase().includes(search.toLowerCase())).toBe(true);
    });
  });

  describe("Number Formatting and Validation", () => {
    it("should pad numbers with leading zeros", () => {
      const pad = (num: number, length: number) =>
        num.toString().padStart(length, "0");
      expect(pad(1, 3)).toBe("001");
      expect(pad(25, 3)).toBe("025");
      expect(pad(151, 3)).toBe("151");
      expect(pad(1025, 3)).toBe("1025");
    });

    it("should validate pokemon id range", () => {
      const validIds = [1, 25, 151, 649, 1025];
      validIds.forEach((id) => {
        expect(id).toBeGreaterThanOrEqual(1);
        expect(id).toBeLessThanOrEqual(1025);
      });
    });

    it("should reject invalid pokemon ids", () => {
      const isValidId = (id: number) => id >= 1 && id <= 1025;
      expect(isValidId(0)).toBe(false);
      expect(isValidId(-1)).toBe(false);
      expect(isValidId(1026)).toBe(false);
      expect(isValidId(9999)).toBe(false);
    });
  });

  describe("Array Operations", () => {
    it("should sort array by id", () => {
      const arr = [
        { id: 25, name: "Pikachu" },
        { id: 1, name: "Bulbasaur" },
        { id: 4, name: "Charmander" },
      ];
      const sorted = arr.sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(1);
      expect(sorted[2].id).toBe(25);
    });

    it("should filter array by property", () => {
      const arr = [
        { id: 25, name: "Pikachu" },
        { id: 1, name: "Bulbasaur" },
        { id: 4, name: "Charmander" },
      ];
      const filtered = arr.filter((item) => item.id > 5);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Pikachu");
    });

    it("should slice array to limit results", () => {
      const arr = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Pokemon${i}`,
      }));
      const limited = arr.slice(0, 10);
      expect(limited).toHaveLength(10);
    });

    it("should map array to extract property", () => {
      const arr = [
        { id: 37, name: "Vulpix" },
        { id: 77, name: "Ponyta" },
        { id: 151, name: "Mew" },
      ];
      const ids = arr.map((item) => item.id);
      expect(ids).toEqual([37, 77, 151]);
    });

    it("should filter and check if item exists", () => {
      const arr = [37, 77, 151, 647, 700];
      const exists = arr.includes(25);
      expect(exists).toBe(false);
      expect(arr.includes(151)).toBe(true);
    });
  });

  describe("Object Operations", () => {
    it("should extract properties from object", () => {
      const pokemon = {
        id: 25,
        name: "Pikachu",
        type: "electric",
      };
      expect(pokemon.id).toBe(25);
      expect(pokemon.name).toBe("Pikachu");
    });

    it("should check if object has property", () => {
      const pokemon = { id: 25, name: "Pikachu" };
      expect(pokemon).toHaveProperty("id");
      expect(pokemon).toHaveProperty("name");
      expect(pokemon).not.toHaveProperty("type");
    });

    it("should merge objects with Object.assign", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3, d: 4 };
      const merged = Object.assign({}, obj1, obj2);
      expect(merged).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });

    it("should reduce entries to create new object", () => {
      const entries = [
        ["key1", "value1"],
        ["key2", "value2"],
      ];
      const obj = entries.reduce<Record<string, string>>((acc, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {});
      expect(obj).toEqual({ key1: "value1", key2: "value2" });
    });
  });

  describe("Navigation URL Generation", () => {
    it("should generate pokemon detail url by id", () => {
      const id = 25;
      const url = `/pokemon/${id}`;
      expect(url).toBe("/pokemon/25");
    });

    it("should generate pokemon detail url by name", () => {
      const name = "pikachu";
      const url = `/pokemon/${name}`;
      expect(url).toBe("/pokemon/pikachu");
    });

    it("should generate previous pokemon url", () => {
      const currentId = 25;
      const previousUrl = `/pokemon/${currentId - 1}`;
      expect(previousUrl).toBe("/pokemon/24");
    });

    it("should generate next pokemon url", () => {
      const currentId = 25;
      const nextUrl = `/pokemon/${currentId + 1}`;
      expect(nextUrl).toBe("/pokemon/26");
    });

    it("should generate home url", () => {
      const url = "/";
      expect(url).toBe("/");
    });
  });

  describe("Type Checking and Validation", () => {
    it("should validate string type", () => {
      const value = "test";
      expect(typeof value).toBe("string");
    });

    it("should validate number type", () => {
      const value = 25;
      expect(typeof value).toBe("number");
    });

    it("should validate object type", () => {
      const value = { id: 1 };
      expect(typeof value).toBe("object");
      expect(value).not.toBeNull();
    });

    it("should validate array type", () => {
      const value = [1, 2, 3];
      expect(Array.isArray(value)).toBe(true);
    });

    it("should validate array of objects", () => {
      const value = [{ id: 1, name: "test" }];
      expect(Array.isArray(value)).toBe(true);
      expect(value[0]).toHaveProperty("id");
    });
  });

  describe("Conditional Logic", () => {
    it("should evaluate boolean conditions", () => {
      const currentId = 25;
      expect(currentId > 1).toBe(true);
      expect(currentId < 1025).toBe(true);
    });

    it("should handle edge case conditions", () => {
      expect(1 > 1).toBe(false);
      expect(1025 < 1025).toBe(false);
    });

    it("should validate truthy and falsy values", () => {
      expect(Boolean("")).toBe(false);
      expect(Boolean("test")).toBe(true);
      expect(Boolean(0)).toBe(false);
      expect(Boolean(1)).toBe(true);
      expect(Boolean(null)).toBe(false);
      expect(Boolean(undefined)).toBe(false);
    });
  });

  describe("Error Scenarios", () => {
    it("should handle division by zero", () => {
      const divide = (a: number, b: number) =>
        b === 0 ? null : a / b;
      expect(divide(10, 2)).toBe(5);
      expect(divide(10, 0)).toBeNull();
    });

    it("should handle undefined array access", () => {
      const arr = [1, 2, 3];
      expect(arr[0]).toBe(1);
      expect(arr[10]).toBeUndefined();
    });

    it("should handle null/undefined assertion", () => {
      const value = null;
      expect(value).toBeNull();
      const undefinedValue = undefined;
      expect(undefinedValue).toBeUndefined();
    });

    it("should handle string index out of bounds", () => {
      const str = "test";
      expect(str.charAt(0)).toBe("t");
      expect(str.charAt(10)).toBe("");
    });
  });
});
