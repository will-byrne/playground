// The Pokémon detail page tests every web client runs. Like pokedex.ts, this
// file is copied verbatim into every web client; each client's
// pokemon-detail.test file only supplies how to render its detail component.
// Keep the copies in sync.

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { describe, expect, it } from "vitest";
import { TEXT, type PokeboxEntry } from "./pokedex.js";
import { bulbasaur, vulpix } from "./pokedex.fixtures.js";

/** Renders the client's detail component for `pokemon` (with the elysia backend) into the document. */
export type RenderPokemonDetail = (pokemon: PokeboxEntry) => unknown | Promise<unknown>;

const mainSprite = (name: string) => screen.getByAltText(`${name} sprite`);
const formButton = (label: string) => screen.getByRole("button", { name: label });
const spriteButton = (key: string) => screen.getByRole("button", { name: new RegExp(`^${key}\\b`) });
const click = async (element: HTMLElement) => {
  fireEvent.click(element);
  // Let frameworks that render asynchronously (lit, angular) catch up.
  await new Promise((resolve) => setTimeout(resolve, 0));
};

export const pokemonDetailCases = (render: RenderPokemonDetail) => {
  const show = async (pokemon: PokeboxEntry) => {
    await render(pokemon);
    await screen.findByRole("heading", { level: 1, name: new RegExp(pokemon.name, "i") });
  };

  describe("pokemon detail", () => {
    it("shows the name and dex number", async () => {
      await show(bulbasaur);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/bulbasaur/i);
      expect(screen.getByText("#001")).toBeInTheDocument();
    });

    it("shows the description on one line", async () => {
      await show(bulbasaur);
      expect(screen.getByText("A strange seed was planted on its back at birth.")).toBeInTheDocument();
    });

    it("shows the types", async () => {
      await show(bulbasaur);
      expect(screen.getByText(/^grass$/i)).toBeInTheDocument();
      expect(screen.getByText(/^poison$/i)).toBeInTheDocument();
    });

    it("shows the abilities with their text", async () => {
      await show(bulbasaur);
      expect(screen.getByText(/^overgrow$/i)).toBeInTheDocument();
      expect(screen.getByText("Ups GRASS moves in a pinch.")).toBeInTheDocument();
      expect(screen.getByText("Strengthens grass moves.")).toBeInTheDocument();
      expect(screen.getByText(/^chlorophyll$/i)).toBeInTheDocument();
    });

    it("starts on the official artwork", async () => {
      await show(bulbasaur);
      expect(mainSprite("bulbasaur")).toHaveAttribute("src", "https://img.test/1/official-artwork-front_default.png");
    });

    it("shows a gallery entry per sprite", async () => {
      await show(bulbasaur);
      for (const key of ["front_default", "front_shiny", "back_default", "official-artwork-front_default"]) {
        expect(spriteButton(key)).toBeInTheDocument();
      }
      expect(screen.getAllByRole("button", { pressed: true }).map((b) => b.textContent?.trim())).toContain(
        TEXT.selected,
      );
    });

    it("shows the sprite picked from the gallery", async () => {
      await show(bulbasaur);
      await click(spriteButton("back_default"));
      await waitFor(() => expect(mainSprite("bulbasaur")).toHaveAttribute("src", "https://img.test/1/back_default.png"));
      expect(spriteButton("back_default")).toHaveAttribute("aria-pressed", "true");
    });

    it("shows the shiny sprite when shiny is on", async () => {
      await show(bulbasaur);
      await click(screen.getByLabelText(TEXT.shiny));
      await waitFor(() =>
        expect(mainSprite("bulbasaur")).toHaveAttribute("src", "https://img.test/1/official-artwork-front_shiny.png"),
      );
    });

    it("hides the shiny toggle for a sprite without a shiny version", async () => {
      await show(bulbasaur);
      await click(spriteButton("back_default"));
      await waitFor(() => expect(screen.queryByLabelText(TEXT.shiny)).toBeNull());
    });
  });

  describe("pokemon forms", () => {
    it("are hidden for a species with one form", async () => {
      await show(bulbasaur);
      expect(screen.queryByRole("heading", { name: TEXT.forms })).toBeNull();
    });

    it("start on the Pokémon that was looked up", async () => {
      await show(vulpix);
      expect(screen.getByRole("heading", { name: TEXT.forms })).toBeInTheDocument();
      expect(formButton(TEXT.defaultForm)).toHaveAttribute("aria-pressed", "true");
      expect(formButton("Alolan Form")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText(/^fire$/i)).toBeInTheDocument();
    });

    it("switch to the chosen form's description, types, abilities and sprites", async () => {
      await show(vulpix);
      await click(formButton("Alolan Form"));

      await waitFor(() => expect(formButton("Alolan Form")).toHaveAttribute("aria-pressed", "true"));
      expect(formButton(TEXT.defaultForm)).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("It exhales air colder than -58 degrees Fahrenheit.")).toBeInTheDocument();
      expect(screen.getByText(/^ice$/i)).toBeInTheDocument();
      expect(screen.queryByText(/^fire$/i)).toBeNull();
      expect(screen.getByText(/^snow-cloak$/i)).toBeInTheDocument();
      expect(screen.queryByText(/^flash-fire$/i)).toBeNull();
      expect(mainSprite("vulpix-alola")).toHaveAttribute(
        "src",
        "https://img.test/10103/official-artwork-front_default.png",
      );
      // The heading stays the Pokémon that was looked up.
      expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/vulpix/i);
      expect(screen.getByText("#037")).toBeInTheDocument();
    });

    it("switch back to the default form", async () => {
      await show(vulpix);
      await click(formButton("Alolan Form"));
      await waitFor(() => expect(formButton("Alolan Form")).toHaveAttribute("aria-pressed", "true"));
      await click(formButton(TEXT.defaultForm));
      await waitFor(() => expect(screen.getByText(/^fire$/i)).toBeInTheDocument());
      expect(mainSprite("vulpix")).toHaveAttribute("src", "https://img.test/37/official-artwork-front_default.png");
    });

    it("start the new form on its default sprite", async () => {
      await show(vulpix);
      await click(spriteButton("back_default"));
      await waitFor(() => expect(mainSprite("vulpix")).toHaveAttribute("src", "https://img.test/37/back_default.png"));
      await click(formButton("Alolan Form"));
      await waitFor(() =>
        expect(mainSprite("vulpix-alola")).toHaveAttribute(
          "src",
          "https://img.test/10103/official-artwork-front_default.png",
        ),
      );
      expect(screen.queryByRole("button", { name: /^back_default\b/ })).toBeNull();
    });
  });
};
