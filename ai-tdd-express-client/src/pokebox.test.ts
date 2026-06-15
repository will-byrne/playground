import { PokeboxEntry } from '.';
import { getPokemon, getPokedex } from './pokebox';
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


describe('pokebox.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log to prevent cluttering test output (ai suggested this but it could be annoying if not removed when debugging tests)
  });

  describe('getPokemon', () => {
    it('should return a Pokemon from storage if it exists', async () => {
      const mockPokemon = { id: 1, name: 'bulbasaur' };
      (storage.getPokemonById as jest.Mock).mockResolvedValue(mockPokemon);

      const result = await getPokemon(1);
      
      expect(result).toEqual(mockPokemon);
      expect(storage.getPokemonById).toHaveBeenCalledWith(1);
    });

    it('should fetch via id if a number is provided', async () => {
      const mockPokemon = { id: 1, name: 'bulbasaur' };
      (storage.getPokemonById as jest.Mock).mockResolvedValue(mockPokemon);
      (storage.getPokemonByName as jest.Mock).mockResolvedValue(mockPokemon);
      
      await getPokemon(1);

      expect(storage.getPokemonById).toHaveBeenCalledWith(1);
      expect(storage.getPokemonByName).not.toHaveBeenCalled();
    });

    it('should fetch via name if a non number is provided', async () => {
      const mockPokemon = { id: 1, name: 'bulbasaur' };
      (storage.getPokemonById as jest.Mock).mockResolvedValue(mockPokemon);
      (storage.getPokemonByName as jest.Mock).mockResolvedValue(mockPokemon);
      
      await getPokemon('bulbasaur');

      expect(storage.getPokemonById).not.toHaveBeenCalledWith();
      expect(storage.getPokemonByName).toHaveBeenCalledWith('bulbasaur');
    });

    it('should fetch from pokemonService and store if not in storage', async () => {
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);

      const mockPokemon = { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }], sprites: {}, abilities: [] };
      const mockAbilities = [{ name: 'overgrow', flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'Boosts grass moves.' }], effect_entries: [{ language: { name: 'en' }, effect: 'Increases power of grass moves.' }] }];
      const mockSpecies = { flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'A strange seed was planted on its back at birth.' }] };

      (pokemonService.getPokemon as jest.Mock).mockResolvedValue(mockPokemon);
      (pokemonService.getAbilities as jest.Mock).mockResolvedValue(mockAbilities);
      (pokemonService.getSpecies as jest.Mock).mockResolvedValue(mockSpecies);

      const result = await getPokemon(1);

      expect(pokemonService.getPokemon).toHaveBeenCalledWith(1);
      expect(pokemonService.getAbilities).toHaveBeenCalledWith(mockPokemon);
      expect(pokemonService.getSpecies).toHaveBeenCalledWith(mockPokemon);
      expect(storage.storePokemon).toHaveBeenCalled();
      expect(result.name).toBe('bulbasaur');
    });

    it('should throw an error if pokemon is not found', async () => {
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);
      (pokemonService.getPokemon as jest.Mock).mockRejectedValue(new Error('404'));

      await expect(getPokemon(1)).rejects.toThrow('Could not find Pokemon with id: 1: Error: 404');
    });

    it('should throw an error if abilities cannot be retrieved', async () => {
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);

      const mockPokemon = { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }], sprites: {}, abilities: [] };
      (pokemonService.getPokemon as jest.Mock).mockResolvedValue(mockPokemon);
      (pokemonService.getAbilities as jest.Mock).mockResolvedValue(null);

      await expect(getPokemon(1)).rejects.toThrow('Could not find Pokemon with id: 1: Error: Unable to retrieve abilities');
    });

     it('should throw an error if species description cannot be retrieved', async () => {
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);

      const mockPokemon = { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }], sprites: {}, abilities: [] };
      const mockAbilities = [{ name: 'overgrow', flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'Boosts grass moves.' }], effect_entries: [{ language: { name: 'en' }, effect: 'Increases power of grass moves.' }] }];
      const mockSpecies = { flavor_text_entries: [{ language: { name: 'en' } }] };

      (pokemonService.getPokemon as jest.Mock).mockResolvedValue(mockPokemon);
      (pokemonService.getAbilities as jest.Mock).mockResolvedValue(mockAbilities);
      (pokemonService.getSpecies as jest.Mock).mockResolvedValue(mockSpecies);

      await expect(getPokemon(1)).rejects.toThrow('Could not find Pokemon with id: 1: Error: Unable to retrieve species description');
    });

    it('should return the correct PokeboxEntry structure when fetching from pokemonService', async () => {
      (storage.getPokemonById as jest.Mock).mockResolvedValue(null);

      const mockPokemon = { id: 1, name: 'bulbasaur', types: [{ type: { name: 'grass' } }], sprites: {}, abilities: [] };
      const mockAbilities = [{ name: 'overgrow', flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'Boosts grass moves.' }], effect_entries: [{ language: { name: 'en' }, effect: 'Increases power of grass moves.' }] }];
      const mockSpecies = { flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'A strange seed was planted on its back at birth.' }] };

      (pokemonService.getPokemon as jest.Mock).mockResolvedValue(mockPokemon);
      (pokemonService.getAbilities as jest.Mock).mockResolvedValue(mockAbilities);
      (pokemonService.getSpecies as jest.Mock).mockResolvedValue(mockSpecies);

      const result = await getPokemon(1);
      const expected: PokeboxEntry = {
        id: 1,
        name: 'bulbasaur',
        species_description: 'A strange seed was planted on its back at birth.',
        types: ['grass'],
        sprites: {
          front_default: null,
          front_shiny: null,
          front_female: null,
          front_shiny_female: null,
          back_default: null,
          back_shiny: null,
          back_female: null,
          back_shiny_female: null,
          versions: {} as any
        },
        abilities: [{
          name: 'overgrow',
          flavour_text: 'Boosts grass moves.',
          effect: 'Increases power of grass moves.'
        }]
      };

      expect(result).toEqual(expected);
    });
  });

  describe('getPokedex', () => {
    it('should return the pokedex from storage', async () => {
      const mockPokedex = [{ id: 1, name: 'bulbasaur' }, { id: 2, name: 'ivysaur' }];
      (storage.getPokedex as jest.Mock).mockResolvedValue(mockPokedex);

      const result = await getPokedex();

      expect(result).toEqual(mockPokedex);
      expect(storage.getPokedex).toHaveBeenCalled();
    });

    it('should return an empty array if no pokemon are found', async () => {
      (storage.getPokedex as jest.Mock).mockResolvedValue([]);

      const result = await getPokedex();

      expect(result).toEqual([]);
    });
  });
});