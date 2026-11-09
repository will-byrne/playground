import { pokedex, pikachu } from "./fixtures.ts";
import { expect, test } from "./test.ts";
import { DEX_MAX, TEXT, capitalize, formatDexNo } from "./pokedex.ts";

test.describe("home page", () => {
  test("shows the title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(TEXT.title);
    await expect(page.getByText(TEXT.subtitle)).toBeVisible();
  });

  test("counts the stored Pokémon and what's left", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(String(DEX_MAX - pokedex.length), { exact: true })).toBeVisible();
    await expect(page.getByText(String(pokedex.length), { exact: true })).toBeVisible();
  });

  test("features stored Pokémon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(formatDexNo(37), { exact: true })).toBeVisible();
    await page.getByRole("link", { name: TEXT.viewDetails }).first().click();
    await expect(page).toHaveURL(/\/pokemon\/vulpix$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/vulpix/i);
  });

  test("searching lists matching Pokémon to open", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(TEXT.searchLabel).fill("vul");
    await expect(page.getByText(TEXT.searchResults)).toBeVisible();
    await page.getByRole("link", { name: /#037\s*vulpix/i }).click();
    await expect(page).toHaveURL(/\/pokemon\/vulpix$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/vulpix/i);
  });

  test("search opens the Pokémon typed in", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(TEXT.searchLabel).fill("Bulbasaur");
    await page.getByRole("button", { name: TEXT.search, exact: true }).click();
    await expect(page).toHaveURL(/\/pokemon\/Bulbasaur$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/bulbasaur/i);
  });

  test("browsing opens the chosen Pokémon", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(TEXT.browseLabel).selectOption({ label: `${formatDexNo(2)} - ${capitalize("ivysaur")}` });
    await expect(page).toHaveURL(/\/pokemon\/ivysaur$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/ivysaur/i);
  });

  test("random opens a Pokémon that wasn't stored yet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: TEXT.random }).click();
    await expect(page).toHaveURL(new RegExp(`/pokemon/${pikachu.name}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/pikachu/i);
  });

  test("the backend can be switched and stays in the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(TEXT.backendLabel).selectOption("rust");
    await expect(page).toHaveURL(/\/\?backend=rust$/);
    await page.getByLabel(TEXT.searchLabel).fill("1");
    await page.getByRole("button", { name: TEXT.search, exact: true }).click();
    await expect(page).toHaveURL(/\/pokemon\/1\?backend=rust$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/bulbasaur/i);
  });

  for (const [backend, kind] of [
    ["go", "server"],
    ["hono", "upstream"],
    ["java", "unreachable"],
  ] as const) {
    test(`says what went wrong when the ${backend} backend fails (${kind})`, async ({ page }) => {
      await page.goto(`/?backend=${backend}`);
      await expect(page.getByRole("alert")).toContainText(TEXT.pokedexError(backend, kind));
    });
  }

  test("links to the same page in the other clients", async ({ page }) => {
    await page.goto("/?backend=rust");
    await expect(page.getByRole("link", { name: "Lit", exact: true })).toHaveAttribute(
      "href",
      "http://localhost:4002/?backend=rust",
    );
  });
});
