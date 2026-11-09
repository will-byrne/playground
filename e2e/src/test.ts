// `test` for the e2e specs: every page has its backend requests rerouted to
// WireMock, and sprite images answered locally so the tests don't need the
// network.

import { test as base, type Page } from "@playwright/test";
import { backendForPort, wiremockBackendUrl } from "./clients.ts";

/** A 1x1 transparent PNG. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const routeBackends = async (page: Page) => {
  await page.route(/^http:\/\/localhost:300\d\//, async (route) => {
    const url = new URL(route.request().url());
    const backend = backendForPort(url.port);
    if (!backend) return route.abort("addressunreachable");
    let response;
    try {
      response = await route.fetch({ url: `${wiremockBackendUrl(backend)}${url.pathname}${url.search}` });
    } catch {
      // WireMock reset the connection (the java backend): the browser sees a network error.
      return route.abort("connectionreset");
    }
    await route.fulfill({ response });
  });
  await page.route(/^https:\/\/raw\.githubusercontent\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await routeBackends(page);
    // Wait for the network to settle after loading a page: SSR clients
    // (Remix, SvelteKit) show the page before their dev builds have loaded
    // and hydrated it, and clicks before then do nothing.
    const goto = page.goto.bind(page);
    page.goto = (url, options) => goto(url, { waitUntil: "networkidle", ...options });
    await use(page);
  },
});

export { expect } from "@playwright/test";
