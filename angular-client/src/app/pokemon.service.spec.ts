import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PokemonService } from './pokemon.service';
import { getFetchErrorKind } from './pokedex';

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
    const request = service.getPokedex('rust');

    const req = httpTestingController.expectOne('http://localhost:3000/pokedex');
    expect(req.request.method).toBe('GET');

    req.flush([{ id: 1, name: 'Bulbasaur' }]);

    const pokedex = await request;
    expect(Array.isArray(pokedex)).toBeTrue();
    expect(pokedex.length).toBeGreaterThan(0);
  });

  it('should expose the pokemon endpoint', async () => {
    const request = service.getPokemon('rust', '1');

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

  it('should use the Elysia backend when selected', async () => {
    const request = service.getPokedex('elysia');

    httpTestingController.expectOne('http://localhost:3001/pokedex').flush([
      { id: 25, name: 'pikachu' },
      { id: 1, name: 'bulbasaur' },
    ]);

    expect((await request).map(({ id }) => id)).toEqual([1, 25]);
  });

  it('should reject with the status when unable to retrieve the pokemon', async () => {
    const request = service.getPokemon('rust', '1');

    const req = httpTestingController.expectOne('http://localhost:3000/pokemon/1');
    expect(req.request.method).toBe('GET');

    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error'});

    const error = await request.catch((e) => e);
    expect(getFetchErrorKind(error)).toBe('server');
  });

  it('should report a missing pokemon as not found', async () => {
    const request = service.getPokemon('rust', 'missingno');

    httpTestingController
      .expectOne('http://localhost:3000/pokemon/missingno')
      .flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(getFetchErrorKind(await request.catch((e) => e))).toBe('not-found');
  });

  it('should report a PokeAPI failure as upstream', async () => {
    const request = service.getPokemon('rust', '1');

    httpTestingController
      .expectOne('http://localhost:3000/pokemon/1')
      .flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(getFetchErrorKind(await request.catch((e) => e))).toBe('upstream');
  });

  it('should reject when the pokedex cannot be loaded', async () => {
    const request = service.getPokedex('rust');

    httpTestingController
      .expectOne('http://localhost:3000/pokedex')
      .flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(getFetchErrorKind(await request.catch((e) => e))).toBe('server');
  });
});
