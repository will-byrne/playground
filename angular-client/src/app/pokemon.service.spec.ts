import { TestBed } from '@angular/core/testing';
import { PokemonService } from './pokemon.service';

describe('PokemonService', () => {
  let service: PokemonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PokemonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the pokedex endpoint', async () => {
    const pokedex = await service.getPokedex();
    expect(Array.isArray(pokedex)).toBeTrue();
    expect(pokedex.length).toBeGreaterThan(0);
  });
});
