// Fuzzes the server at BASE_URL (default: rust-server on :3000) against
// openapi.yaml with Schemathesis; options live in schemathesis.toml. Any
// extra arguments go straight to `schemathesis run`, e.g. `--seed 123` to
// replay a run or `--max-examples 500` for a longer one.
//
// Schemathesis isn't in nixpkgs, so it runs through uvx at a pinned version.
const SCHEMATHESIS = "schemathesis@4.33.1";

// Files are passed by absolute path and the run stays in the caller's
// directory, because Schemathesis writes its example database (.hypothesis/)
// and any reports to the working directory, and the Nix build is read-only.
const root = `${import.meta.dir}/..`;
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const proc = Bun.spawn(
  [
    "uvx",
    SCHEMATHESIS,
    "--config-file",
    `${root}/schemathesis.toml`,
    "run",
    `${root}/openapi.yaml`,
    ...process.argv.slice(2),
  ],
  {
    env: { ...process.env, BASE_URL: baseUrl },
    stdio: ["inherit", "inherit", "inherit"],
  },
);
process.exit(await proc.exited);
