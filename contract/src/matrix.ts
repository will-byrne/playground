// Runs the contract suite against every server and prints a pass/fail table.
// Ports match docker-compose.yaml and nix/processes.nix. Pass server names to
// test just those: `bun run matrix rust-server go-server`.
import { spawnSync } from "bun";

const SERVERS: Record<string, number> = {
  "rust-server": 3000,
  "elysia-server": 3001,
  "go-server": 3002,
  "hono-server": 3003,
  "java-server": 3004,
  "effect-server": 3005,
};

const host = process.env.CONTRACT_HOST ?? "localhost";
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SERVERS);

const unknown = names.filter((n) => !(n in SERVERS));
if (unknown.length) {
  console.error(`unknown server(s): ${unknown.join(", ")}`);
  process.exit(2);
}

type Row = { server: string; result: string };
const rows: Row[] = [];

for (const server of names) {
  const baseUrl = `http://${host}:${SERVERS[server]}`;
  const up = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  );
  if (!up) {
    rows.push({ server, result: "not running" });
    continue;
  }

  const run = spawnSync(["bun", "test"], {
    cwd: `${import.meta.dir}/..`,
    env: { ...process.env, BASE_URL: baseUrl },
    stdout: "pipe",
    stderr: "pipe",
  });
  // bun test writes its summary to stderr.
  const out = run.stderr.toString();
  const pass = out.match(/(\d+) pass/)?.[1] ?? "0";
  const fail = out.match(/(\d+) fail/)?.[1] ?? "0";
  rows.push({ server, result: `${run.exitCode === 0 ? "PASS" : "FAIL"}  ${pass} pass, ${fail} fail` });
  if (run.exitCode !== 0) {
    console.log(`\n--- ${server} failures ---`);
    console.log(
      out
        .split("\n")
        .filter((l) => l.includes("(fail)"))
        .join("\n"),
    );
  }
}

console.log();
console.table(rows);
process.exit(rows.some((r) => r.result.startsWith("FAIL")) ? 1 : 0);
