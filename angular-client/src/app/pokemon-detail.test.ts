import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { expect, vi } from 'vitest';
import { PokemonDetailComponent } from './pokemon-detail.component';
import { pokemonDetailCases } from './pokemon-detail.cases';
import { PokemonService } from './pokemon.service';

pokemonDetailCases(async (pokemon) => {
  await TestBed.configureTestingModule({
    imports: [PokemonDetailComponent],
    providers: [
      provideRouter([]),
      { provide: PokemonService, useValue: { getPokemon: () => Promise.resolve(pokemon) } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ idOrName: pokemon.name })),
          queryParamMap: of(convertToParamMap({})),
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PokemonDetailComponent);
  fixture.autoDetectChanges(true);
  // The load finishes in a native await, which zone.js can't see under Vitest
  // (the Angular CLI downlevels it), so render once it's done.
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.componentInstance.status).toBe('loaded');
  });
});
