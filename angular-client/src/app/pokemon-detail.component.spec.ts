import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PokemonDetailComponent } from './pokemon-detail.component';
import { PokemonService } from './pokemon.service';
import type { PokeboxEntry } from './pokedex';

const vulpix: PokeboxEntry = {
  id: 37,
  name: 'vulpix',
  form_name: '',
  species_description: 'At the time of birth, it has just one tail.',
  types: ['fire'],
  abilities: [{ name: 'flash-fire', flavour_text: 'Powers up fire moves.', effect: 'Absorbs fire moves.' }],
  sprites: { front_default: '37.png', front_shiny: '37-shiny.png' },
  varieties: [
    {
      id: 10103,
      name: 'vulpix-alola',
      form_name: 'Alolan Form',
      is_default: false,
      species_description: 'It exhales air colder than -58 degrees Fahrenheit.',
      types: ['ice'],
      abilities: [{ name: 'snow-cloak', flavour_text: 'Ups evasion in a hailstorm.', effect: 'Increases evasion during hail.' }],
      sprites: { front_default: '10103.png' },
    },
  ],
};

const render = async (pokemon: PokeboxEntry) => {
  await TestBed.configureTestingModule({
    imports: [PokemonDetailComponent],
    providers: [
      provideRouter([]),
      { provide: PokemonService, useValue: { getPokemon: () => Promise.resolve(pokemon) } },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ idOrName: pokemon.name })), queryParamMap: of(convertToParamMap({})) },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PokemonDetailComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.pd-forms button')).find((b) => b.textContent?.trim() === label);
  return { fixture, el, button };
};

describe('PokemonDetailComponent forms', () => {
  it('hides the forms for a species with one form', async () => {
    const { el } = await render({ ...vulpix, varieties: [] });
    expect(el.querySelector('.pd-forms')).toBeNull();
  });

  it('starts on the Pokémon that was looked up', async () => {
    const { el, button } = await render(vulpix);
    expect(button('Default Form')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('Alolan Form')?.getAttribute('aria-pressed')).toBe('false');
    expect(el.querySelector('.pd-badges')?.textContent).toContain('fire');
  });

  it("shows the selected form's description, types, abilities and sprites", async () => {
    const { fixture, el, button } = await render(vulpix);
    button('Alolan Form')!.click();
    fixture.detectChanges();

    expect(button('Alolan Form')?.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('.pd-description')?.textContent).toContain('It exhales air colder than -58 degrees');
    expect(el.querySelector('.pd-badges')?.textContent?.trim()).toBe('ice');
    expect(el.textContent).toContain('snow-cloak');
    expect(el.textContent).not.toContain('flash-fire');
    const sprite = el.querySelector<HTMLImageElement>('.pd-main-sprite')!;
    expect(sprite.getAttribute('alt')).toBe('vulpix-alola sprite');
    expect(sprite.getAttribute('src')).toBe('10103.png');
    // The heading stays the Pokémon that was looked up.
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('vulpix');
  });
});
