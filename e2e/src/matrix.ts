// Runs the e2e suite against every web client in turn and prints a pass/fail
// table. Pass client names to test just those: `bun run matrix react lit`.
import { spawnSync } from "bun";
import { CLIENT_SETUPS, isClient } from "./clients.ts";

const wanted = process.argv.slice(2);
const clients = wanted.length ? wanted : Object.keys(CLIENT_SETUPS);

const unknown = clients.filter((c) => !isClient(c));
if (unknown.length) {
  console.error(`unknown client(s): ${unknown.join(", ")}`);
  process.exit(2);
}

type Row = { client: string; result: string };
const rows: Row[] = [];

for (const client of clients) {
  console.log(`\n=== ${client} ===`);
  const run = spawnSync(["bunx", "playwright", "test", "--reporter=line"], {
    cwd: `${import.meta.dir}/..`,
    env: { ...process.env, CLIENT: client },
    stdout: "pipe",
    stderr: "inherit",
  });
  const out = run.stdout.toString();
  console.log(out);
  const passed = out.match(/(\d+) passed/)?.[1] ?? "0";
  const failed = out.match(/(\d+) failed/)?.[1] ?? "0";
  rows.push({ client, result: `${run.exitCode === 0 ? "PASS" : "FAIL"}  ${passed} passed, ${failed} failed` });
}

console.log();
console.table(rows);
process.exit(rows.some((r) => r.result.startsWith("FAIL")) ? 1 : 0);
