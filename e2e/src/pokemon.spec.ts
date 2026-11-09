import { bulbasaur, ivysaur, pikachu, vulpix } from "./fixtures.ts";
import { expect, test } from "./test.ts";
import { TEXT, formatDescription, getDefaultSpriteKey, getForms, getSprites } from "./pokedex.ts";

const heading = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 1 });
const mainSprite = (page: import("@playwright/test").Page, name: string) => page.getByAltText(`${name} sprite`);
const vulpixSprites = getSprites(vulpix.sprites);

test.describe("pokemon page", () => {
  test("finds a Pokémon by name or number", async ({ page }) => {
    await page.goto("/pokemon/vulpix?backend=rust");
    await expect(heading(page)).toHaveText(/vulpix/i);
    await expect(page.getByText("#037", { exact: true })).toBeVisible();

    await page.goto("/pokemon/37?backend=rust");
    await expect(heading(page)).toHaveText(/vulpix/i);
  });

  test("shows the description, types and abilities", async ({ page }) => {
    await page.goto("/pokemon/bulbasaur");
    await expect(page.getByText(formatDescription(bulbasaur.species_description))).toBeVisible();
    for (const type of bulbasaur.types) {
      await expect(page.getByText(type, { exact: true })).toBeVisible();
    }
    for (const ability of bulbasaur.abilities) {
      await expect(page.getByText(ability.name, { exact: true })).toBeVisible();
      await expect(page.getByText(ability.flavour_text)).toBeVisible();
    }
  });

  test("shows the sprite picked from the gallery", async ({ page }) => {
    await page.goto("/pokemon/vulpix");
    const sprite = mainSprite(page, "vulpix");
    await expect(sprite).toHaveAttribute("src", vulpixSprites[getDefaultSpriteKey(vulpixSprites)]);
    await page.getByRole("button", { name: /^back_default\b/ }).click();
    await expect(sprite).toHaveAttribute("src", vulpixSprites.back_default);
  });

  test("shows the shiny sprite when shiny is on", async ({ page }) => {
    await page.goto("/pokemon/vulpix");
    await page.getByRole("button", { name: /^front_default\b/ }).click();
    await page.getByLabel(TEXT.shiny).check();
    await expect(mainSprite(page, "vulpix")).toHaveAttribute("src", vulpixSprites.front_shiny);
  });

  test("steps to the previous and next Pokémon, keeping the backend", async ({ page }) => {
    await page.goto("/pokemon/1?backend=rust");
    await expect(heading(page)).toHaveText(/bulbasaur/i);
    await expect(page.getByRole("button", { name: "Previous Pokémon" })).toHaveCount(0);

    await page.getByRole("button", { name: "Next Pokémon" }).click();
    await expect(page).toHaveURL(/\/pokemon\/2\?backend=rust$/);
    await expect(heading(page)).toHaveText(new RegExp(ivysaur.name, "i"));

    await page.getByRole("button", { name: "Previous Pokémon" }).click();
    await expect(page).toHaveURL(/\/pokemon\/1\?backend=rust$/);
    await expect(heading(page)).toHaveText(/bulbasaur/i);
  });

  test("goes back to the list, keeping the backend", async ({ page }) => {
    await page.goto("/pokemon/1?backend=rust");
    await page.getByRole("button", { name: TEXT.backToList }).click();
    await expect(page).toHaveURL(/\/\?backend=rust$/);
    await expect(heading(page)).toContainText(TEXT.title);
  });

  test("links to the same page in the other clients", async ({ page }) => {
    await page.goto("/pokemon/vulpix?backend=rust");
    await expect(heading(page)).toHaveText(/vulpix/i);
    await expect(page.getByRole("link", { name: "Lit", exact: true })).toHaveAttribute(
      "href",
      "http://localhost:4002/pokemon/vulpix?backend=rust",
    );
  });

  test("says when a Pokémon doesn't exist", async ({ page }) => {
    await page.goto("/pokemon/missingno");
    await expect(heading(page)).toHaveText(TEXT.pokemonErrorTitle("not-found"));
    await expect(page.getByText(TEXT.pokemonError("missingno", "elysia", "not-found"))).toBeVisible();
    await page.getByRole("button", { name: TEXT.backToList }).click();
    await expect(heading(page)).toContainText(TEXT.title);
  });

  for (const [backend, kind] of [
    ["go", "server"],
    ["hono", "upstream"],
    ["java", "unreachable"],
  ] as const) {
    test(`says what went wrong when the ${backend} backend fails (${kind})`, async ({ page }) => {
      await page.goto(`/pokemon/1?backend=${backend}`);
      await expect(heading(page)).toHaveText(TEXT.pokemonErrorTitle(kind));
      await expect(page.getByText(TEXT.pokemonError("1", backend, kind))).toBeVisible();
    });
  }
});

test.describe("pokemon forms", () => {
  test("are hidden for a species with one form", async ({ page }) => {
    await page.goto("/pokemon/bulbasaur");
    await expect(heading(page)).toHaveText(/bulbasaur/i);
    await expect(page.getByRole("heading", { name: TEXT.forms })).toHaveCount(0);
  });

  test("lists every form, starting on the one looked up", async ({ page }) => {
    await page.goto("/pokemon/pikachu");
    await expect(heading(page)).toHaveText(/pikachu/i);
    const forms = getForms(pikachu);
    for (const form of forms) {
      await expect(page.getByRole("button", { name: form.label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: TEXT.defaultForm, exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("switch to the chosen form's description, types, abilities and sprite", async ({ page }) => {
    const [alola] = vulpix.varieties;
    const alolaSprites = getSprites(alola.sprites);
    await page.goto("/pokemon/vulpix");
    await page.getByRole("button", { name: alola.form_name, exact: true }).click();

    await expect(page.getByRole("button", { name: alola.form_name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(formatDescription(alola.species_description))).toBeVisible();
    await expect(page.getByText("ice", { exact: true })).toBeVisible();
    await expect(page.getByText("fire", { exact: true })).toHaveCount(0);
    for (const ability of alola.abilities) {
      await expect(page.getByText(ability.name, { exact: true })).toBeVisible();
    }
    await expect(mainSprite(page, alola.name)).toHaveAttribute("src", alolaSprites[getDefaultSpriteKey(alolaSprites)]);
    await expect(heading(page)).toHaveText(/vulpix/i);

    await page.getByRole("button", { name: TEXT.defaultForm, exact: true }).click();
    await expect(page.getByText("fire", { exact: true })).toBeVisible();
  });
});
