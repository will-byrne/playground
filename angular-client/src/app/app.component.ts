import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CLIENT } from './client';
import { TEXT, getClientLinks } from './pokedex';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-client';
  readonly text = TEXT;
  private readonly router = inject(Router);

  /** Links to the same page in every other client. */
  get clientLinks() {
    return getClientLinks(CLIENT, this.router.url);
  }
}
