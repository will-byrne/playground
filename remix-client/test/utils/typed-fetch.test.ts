// This file seems ok but i want to look closer at is later and see if there are missing test cases.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { typedFetch } from "../../utils/typed-fetch";

describe("typedFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and parse JSON successfully", async () => {
    const mockData = { id: 1, name: "Pikachu" };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await typedFetch("http://localhost:3000/pokemon/1");
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/pokemon/1",
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control": "Allow-Origin",
        },
      }
    );
  });

  it("should throw an error when response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    } as Response);

    await expect(
      typedFetch("http://localhost:3000/pokemon/invalid")
    ).rejects.toThrow(
      "error fetching (http://localhost:3000/pokemon/invalid): Not Found"
    );
  });

  it("should throw an error on network failure", async () => {
    const networkError = new Error("Network error");
    global.fetch = vi.fn().mockRejectedValueOnce(networkError);

    await expect(typedFetch("http://localhost:3000/pokemon/1")).rejects.toThrow(
      "Network error"
    );
  });

  it("should handle complex nested JSON responses", async () => {
    const mockData = {
      id: 1,
      name: "Pikachu",
      abilities: [
        {
          name: "Static",
          flavour_text: "Static electricity",
          effect: "May cause paralysis",
        },
      ],
      types: ["electric"],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await typedFetch("http://localhost:3000/pokemon/1");
    expect(result).toEqual(mockData);
  });

  it("should set correct headers", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    await typedFetch("http://test.com");

    expect(global.fetch).toHaveBeenCalledWith("http://test.com", {
      headers: {
        "Content-Type": "application/json",
        "Access-Control": "Allow-Origin",
      },
    });
  });
});
