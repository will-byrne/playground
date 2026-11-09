// Stopping `docker run` doesn't stop its container, so remove the WireMock
// container the suite started (it never touches one given with WIREMOCK_URL).
import { execFileSync } from "node:child_process";
import { WIREMOCK_CONTAINER } from "./clients.ts";

export default function globalTeardown() {
  if (process.env.WIREMOCK_URL) return;
  try {
    execFileSync("docker", ["rm", "-f", WIREMOCK_CONTAINER], { stdio: "ignore" });
  } catch {
    // Already gone.
  }
}
