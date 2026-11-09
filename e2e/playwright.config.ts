// Runs the shared e2e specs against one web client, chosen with CLIENT (e.g.
// `CLIENT=lit bun run test`). Playwright starts WireMock (in docker, unless
// WIREMOCK_URL points at one already running) and the client's dev server.

import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { CLIENT_SETUPS, WIREMOCK_CONTAINER, WIREMOCK_URL, isClient, serverBackendEnv } from "./src/clients.ts";

const client = process.env.CLIENT ?? "react";
if (!isClient(client)) {
  throw new Error(`CLIENT must be one of ${Object.keys(CLIENT_SETUPS).join(", ")}; got "${client}"`);
}
const { dir, port, command } = CLIENT_SETUPS[client];
const baseURL = `http://localhost:${port}`;
const wiremockDir = fileURLToPath(new URL("./wiremock", import.meta.url));
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "src",
  testMatch: "*.spec.ts",
  globalTeardown: "./src/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Use an installed Chromium (e.g. on NixOS) instead of Playwright's download.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: client, use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    ...(process.env.WIREMOCK_URL
      ? []
      : [
          {
            // Clears a container a killed run left behind; global-teardown removes this one.
            command: `docker rm -f ${WIREMOCK_CONTAINER} >/dev/null 2>&1; docker run --rm --name ${WIREMOCK_CONTAINER} -p 3999:8080 -v ${wiremockDir}:/home/wiremock:ro wiremock/wiremock:3.13.1`,
            url: `${WIREMOCK_URL}/__admin/health`,
            reuseExistingServer: true,
            timeout: 120_000,
          },
        ]),
    {
      command: command(port),
      cwd: `../${dir}`,
      url: baseURL,
      env: { ...serverBackendEnv, NG_CLI_ANALYTICS: "false" },
      reuseExistingServer: !ci,
      timeout: 180_000,
    },
  ],
});
