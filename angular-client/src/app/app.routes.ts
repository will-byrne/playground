import { Routes } from '@angular/router';
import { PokemonDetailComponent } from './pokemon-detail.component';
import { PokemonListComponent } from './pokemon-list.component';

export const routes: Routes = [
  { path: '', component: PokemonListComponent },
  { path: 'pokemon/:idOrName', component: PokemonDetailComponent },
  { path: '**', redirectTo: '' }
];
