import { getPokemon, getPokedex } from './pokebox';
// Import modules as types to ensure we can mock them correctly later
import { pokemonService } from './pokemon-service';
import { storage } from './storage';

/**
 * @jest-environment jsdom
 */

// 1. Setup Mocks for external dependencies using jest.mock and explicit mocks
jest.mock('./pokemon-service', () => ({
  __esModule: true,
  pokemonService: {
    getPokemon: jest.fn(),
    getAbilities: jest.fn(),
    getSpecies: jest.fn(),
  },
}));

jest.mock('./storage', () => ({
  __esModule: true,
  storage: {
    getPokemonById: jest.fn(),
    getPokemonByName: jest.fn(),
    storePokemon: jest.fn(),
    getPokedex: jest.fn(),
  },
}));


describe('Pokebox Module Tests (src/pokebox.ts)', () => {

  // Clear mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log for error handling tests
  });


  describe('getPokemon', () => {

    // --- Test Case 1: Cache Hit (ID Lookup) ---
    it('should return cached Pokemon entry when provided a valid ID number', async () => {
      const mockId = 25;
      const cachedData = { id: mockId, name: "pikachu", species_description: "Electric mouse.", types: ["electric"], sprites: {}, abilities: [] };

      // Use the mocked function reference directly for mocking
      (storage.getPokemonById as jest.Mock).mockResolvedValue(cachedData);

      const result = await getPokemon(mockId);

      expect(result).toEqual(cachedData);
      // Assert that API calls were skipped
      expect(pokemonService.getPokemon).not.toHaveBeenCalled();
    });

    // --- Test Case 2: Cache Hit (Name Lookup) ---
    it('should return cached Pokemon entry when provided a valid name string', async () => {
      const mockName = "bulbasaur";
      const cachedData = { id: 1, name: "bulbasaur", species_description: "A plant-based creature.", types: ["grass", "poison"], sprites: {}, abilities: [] };

      // Use the mocked function reference directly for mocking
      (storage.getPokemonByName as jest.Mock).mockResolvedValue(cachedData);

      const result = await getPokemon(mockName);

      expect(result).toEqual(cachedData);
      // Assert that API calls were skipped
      expect(pokemonService.getPokemon).not.toHaveBeenCalled();
    });


    // --- Test Case 3: Cache Miss (API Success Path) ---
    it('should fetch, process, and store a new Pokemon entry when not found in cache', async () => {
      const mockId = 4;
      const mockName = "charmander";

      // Mock API responses for the full cycle
      (pokemonService.getPokemon as jest.Mock).mockResolvedValue({ id: mockId, name: mockName, types: [{ type: { name: "fire" } }], sprites: {} });
      (pokemonService.getAbilities as jest.Mock).mockResolvedValue([
        {
          name: "brave",
          flavor_text_entries: [{ language: { name: "en" }, flavor_text: "A fiery spirit." }],
          effect_entries: [{ language: { name: "en" }, effect: "Increases attack by 1." }]
        }
      ]);
      (pokemonService.getSpecies as jest.Mock).mockResolvedValue({
        flavor_text_entries: [
            { language: { name: "fr" }, flavor_text: "Un feu ardent." },
            { language: { name: "en" }, flavor_text: "A fiery spirit, born from a lizard's tail.", entry_number: 1 } // English description
        ]
      });

      // Mock storage to return null/undefined (cache miss) for both ID and Name lookups
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);
      (storage.getPokemonByName as jest.Mock).mockResolvedValue(null);


      const result = await getPokemon("charmander"); // Use name lookup path

      // 1. Assert API calls were made in sequence
      expect(pokemonService.getPokemon).toHaveBeenCalledWith("charmander");
      expect(pokemonService.getAbilities).toHaveBeenCalled();
      expect(pokemonService.getSpecies).toHaveBeenCalled();

      // 2. Assert storage was called to save the result
      const expectedEntry = {
        id: mockId,
        name: mockName,
        species_description: "A fiery spirit, born from a lizard's tail.", // Extracted English text
        types: ["fire"],
        sprites: {},
        abilities: [{
          name: "brave",
          flavour_text: "A fiery spirit.",
          effect: "Increases attack by 1."
        }]
      };

      expect(storage.storePokemon).toHaveBeenCalledWith(expectedEntry);
      // 3. Assert the returned value is correct
      expect(result).toEqual(expectedEntry);
    });


    // --- Test Case 4a: Error Handling (API Failure) ---
    it('should catch and re-throw an error if species retrieval fails', async () => {
        const mockId = "test";

        // Mock API to fail at the species step
        (pokemonService.getPokemon as jest.Mock).mockResolvedValue({ id: 1, name: 'fail', types: [] });
        (pokemonService.getAbilities as jest.Mock).mockResolvedValue([]);
        (pokemonService.getSpecies as jest.Mock).mockRejectedValue(new Error("API Down"));

        // Expect the function to catch and re-throw the error, and log it
        await expect(getPokemon(mockId)).rejects.toThrow("API Down");
        expect(console.log).toHaveBeenCalledWith(`Could not find Pokemon with id: ${mockId}: Error: API Down`);

        // Ensure storage was NOT called to store data on failure
        expect(storage.storePokemon).not.toHaveBeenCalled();
    });


    // --- Test Case 4b: Error Handling (Storage Failure) ---
    it('should handle errors if initial storage lookup fails', async () => {
      const mockId = "fail-storage";

      // Mock storage to throw an error immediately, simulating a failure before API calls are needed.
      (storage.getPokemonByName as jest.Mock).mockRejectedValue(new Error("DB Connection Lost"));

      await expect(getPokemon(mockId)).rejects.toThrow("DB Connection Lost");
    });


  }); // End getPokemon describe block


  describe('getPokedex', () => {
    // --- Test Case 5: Simple Wrapper Test ---
    it('should return the list of Pokemon from storage without calling other services', async () => {
      const mockPokedex = [
        { id: 1, name: "Bulbasaur" },
        { id: 2, name: "Ivysaur" }
      ];

      (storage.getPokedex as jest.Mock).mockResolvedValue(mockPokedex);

      const result = await getPokedex();

      expect(result).toEqual(mockPokedex);
      // Assert that only the storage method was called
      expect(storage.getPokemonById).not.toHaveBeenCalled();
    });
  }); // End getPokedex describe block


});