import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PokemonService, PokedexEntry } from './pokemon.service';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pokemon-list.component.html',
  styleUrl: './pokemon-list.component.scss'
})
export class PokemonListComponent implements OnInit {
  pokedex: PokedexEntry[] = [];
  filteredPokedex: PokedexEntry[] = [];
  idOrName = '';
  randomLoading = false;
  featuredPokemonIds = [37, 77, 151, 647, 700];

  constructor(private readonly pokemonService: PokemonService, private readonly router: Router) {}

  async ngOnInit(): Promise<void> {
    this.pokedex = (await this.pokemonService.getPokedex()).sort((a, b) => a.id - b.id);
  }

  onSearchInput(value: string): void {
    this.idOrName = value;
    if (!value.trim()) {
      this.filteredPokedex = [];
      return;
    }

    const query = value.toLowerCase();
    this.filteredPokedex = this.pokedex
      .filter((pokemon) => pokemon.name.toLowerCase().includes(query) || pokemon.id.toString().includes(value))
      .slice(0, 10);
  }

  async onRandomNewPokemon(): Promise<void> {
    this.randomLoading = true;
    try {
      const pokemon = await this.pokemonService.getRandomNewPokemon();
      void this.router.navigate(['/pokemon', pokemon.name]);
    } catch (error) {
      console.error('Failed to fetch a random new Pokémon:', error);
    } finally {
      this.randomLoading = false;
    }
  }

  onSearchSubmit(): void {
    if (this.idOrName.trim()) {
      void this.router.navigate(['/pokemon', this.idOrName.trim()]);
    }
  }

  onPokedexSelect(value: string): void {
    if (value) {
      void this.router.navigate(['/pokemon', value]);
    }
  }

  get featuredPokemon(): Array<PokedexEntry | undefined> {
    return this.featuredPokemonIds.map((id) => this.pokedex.find((pokemon) => pokemon.id === id));
  }
}
