import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PokemonService } from './pokemon.service';

describe('PokemonService', () => {
  let service: PokemonService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PokemonService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the pokedex endpoint', async () => {
    const request = service.getPokedex();

    const req = httpTestingController.expectOne('http://localhost:3000/pokedex');
    expect(req.request.method).toBe('GET');

    req.flush([{ id: 1, name: 'Bulbasaur' }]);

    const pokedex = await request;
    expect(Array.isArray(pokedex)).toBeTrue();
    expect(pokedex.length).toBeGreaterThan(0);
  });

  it('should expose the pokemon endpoint', async () => {
    const request = service.getPokemon('1');

    const req = httpTestingController.expectOne('http://localhost:3000/pokemon/1');
    expect(req.request.method).toBe('GET');

    req.flush({
      id: 1,
      name: 'bulbasaur'
    });
    const pokemon = await request;
    expect(pokemon?.id).toBe(1);
    expect(pokemon?.name).toBe('bulbasaur');
  });

  it('should throw an error if unable to retrieve the pokemon', async () => {
    const request = service.getPokemon('1');

    const req = httpTestingController.expectOne('http://localhost:3000/pokemon/1');
    expect(req.request.method).toBe('GET');

    req.flush('Failed', { status: 500, statusText: 'Internal Server Error'});

    await expectAsync(request).toBeRejectedWithError('Error fetching Pokemon: 1');
  });
});
