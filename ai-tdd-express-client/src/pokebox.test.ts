import { getPokemon, getPokedex } from "./pokebox";

describe('pokebox', () => {
  it('should fetch pokemon by id', async () => {
    const bulbasaur = await getPokemon(1);
    expect(bulbasaur).toBeDefined();
    expect(bulbasaur.name).toBe('bulbasaur');
  });

  it('should fetch pokemon by name', async () => {
    const bulbasaur = await getPokemon('bulbasaur');
    expect(bulbasaur).toBeDefined();
    expect(bulbasaur.id).toBe(1);
  });

  it('should return the pokedex', async () => {
    const pokedex = await getPokedex();
    expect(pokedex).toBeDefined();
    expect(pokedex.length).toBeGreaterThan(0);
    expect(pokedex[0]).toHaveProperty('id');
    expect(pokedex[0]).toHaveProperty('name');
  });
});