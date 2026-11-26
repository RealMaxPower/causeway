import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));
const marker = ["causeway", "private", "canary"].join("-");
const stubDetector = [
  'import { createHash } from "node:crypto";',
  'import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";',
  'import { join } from "node:path";',
  'const marker = ["causeway", "private", "canary"].join("-");',
  'function config(root) {',
  '  const path = join(root, ".git", "fixture-detector.json");',
  '  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};',
  '}',
  'export async function verifyTools(root) {',
  '  if (config(root).missingTool) throw new Error(marker);',
  '}',
  'export async function scanTextRecords(records, { root }) {',
  '  for (const record of records) {',
  '    const digest = createHash("sha256").update(record.content, "utf8").digest("hex");',
  '    if (digest !== record.sha256) throw new Error("Fixture record bytes changed");',
  '  }',
  '  appendFileSync(join(root, ".git", "fixture-scans"), "scan\\n");',
  '  const settings = config(root);',
  '  if (settings.mutateArtifact) {',
  '    await new Promise((resolve) => setTimeout(resolve, 10));',
  '    writeFileSync(join(root, settings.mutateArtifact), marker);',
  '  }',
  '  return records.filter((record) => record.content.includes(marker)).map((record) => ({',
  '    recordId: record.id, detector: "presidio", rule: "EMAIL_ADDRESS",',
  '    line: 1, fingerprint: "a".repeat(64),',
  '  }));',
  '}',
].join("\n");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "causeway-privacy-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_DATE: "2020-01-01T00:00:00+0000",
    GIT_COMMITTER_DATE: "2020-01-01T00:00:00+0000",
  };
  // These commits exist only in a temporary repository with no remote.
  const git = (...args) => exec("git", args, { cwd: root, env });
  await git("init", "--quiet");
  await git("config", "user.name", "Fixture");
  await git("config", "user.email", ["fixture", "invalid.example"].join("@"));
  await git("config", "commit.gpgsign", "false");
  const scriptDir = join(root, "scripts", "sensitive-data");
  await mkdir(scriptDir, { recursive: true });
  for (const name of ["cli.mjs", "git.mjs", "git-snapshot.mjs", "git-metadata.mjs", "policy.mjs", "rules.mjs", "gate.mjs", "install-hooks.mjs"]) {
    await copyFile(join(sourceRoot, "scripts", "sensitive-data", name), join(scriptDir, name));
  }
  // Replace the detector module in this isolated fixture, never in production.
  // This tests the real CLI/control flow without a production bypass switch.
  await writeFile(join(scriptDir, "detectors.mjs"), stubDetector);
  await writeFile(join(scriptDir, "policy.json"), JSON.stringify({
    version: 2, exceptions: [], artifacts: [],
  }));
  await mkdir(join(root, ".githooks"));
  for (const name of ["pre-commit", "commit-msg", "pre-push"]) {
    await copyFile(join(sourceRoot, ".githooks", name), join(root, ".githooks", name));
    await chmod(join(root, ".githooks", name), 0o755);
  }
  await writeFile(join(root, "lesson.txt"), "Public learning example.\n");
  await git("add", ".");
  await git("commit", "--quiet", "-m", "Initial synthetic fixture");
  return { root, env, git };
}

async function cli(f, ...args) {
  try {
    const result = await exec(process.execPath, [
      join(f.root, "scripts", "sensitive-data", "cli.mjs"), ...args,
    ], { cwd: f.root, env: f.env, timeout: 30_000 });
    return { code: 0, ...result };
  } catch (error) {
    if (!Number.isInteger(error.code)) throw error;
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

function report(result) {
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
}

function assertRedacted(result) {
  assert.ok(!result.stdout.includes(marker), "stdout must not contain raw fixture content");
  assert.ok(!result.stderr.includes(marker), "stderr must not contain raw fixture content");
}

async function scanCount(f) {
  const path = join(f.root, ".git", "fixture-scans");
  try {
    return (await readFile(path, "utf8")).trim().split("\n").filter(Boolean).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}

test("CLI history defaults to all refs and catches removed historical content", async (t) => {
  const f = await fixture(t);
  const initial = await cli(f, "history");
  assert.equal(initial.code, 0);
  assert.equal(report(initial).passed, true);
  assert.ok(report(initial).records > 0, "default history must not silently scan an empty selection");

  await writeFile(join(f.root, "historical.txt"), marker);
  await f.git("add", ".");
  await f.git("commit", "--quiet", "-m", "Add synthetic historical fixture");
  await rm(join(f.root, "historical.txt"));
  await f.git("add", "-u");
  await f.git("commit", "--quiet", "-m", "Remove synthetic historical fixture");
  const result = await cli(f, "history");
  assert.equal(result.code, 1);
  assert.equal(report(result).passed, false);
  assert.ok(report(result).findings.some((finding) => finding.rule === "EMAIL_ADDRESS"));
  assertRedacted(result);
});

test("CLI staged scans indexed bytes even when the working copy is clean", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.root, "lesson.txt"), marker);
  await f.git("add", "lesson.txt");
  await writeFile(join(f.root, "lesson.txt"), "Public replacement only in the working copy.\n");
  const working = await cli(f, "worktree");
  assert.equal(working.code, 0);
  assert.equal(report(working).passed, true);
  const staged = await cli(f, "staged");
  assert.equal(staged.code, 1);
  assert.equal(report(staged).passed, false);
  assertRedacted(staged);
});

test("CLI commit-msg blocks sensitive final messages without printing them", async (t) => {
  const f = await fixture(t);
  const message = join(f.root, ".git", "proposed-message.txt");
  await writeFile(message, marker);
  const result = await cli(f, "commit-msg", message);
  assert.equal(result.code, 1);
  assert.equal(report(result).passed, false);
  assertRedacted(result);
});

test("CLI commit-msg reuses only a matching staged/control receipt", async (t) => {
  const f = await fixture(t);
  const message = join(f.root, ".git", "proposed-message.txt");
  await writeFile(message, "A reviewed synthetic message.\n");
  assert.equal((await cli(f, "pre-commit")).code, 0);
  const before = await scanCount(f);
  const result = await cli(f, "commit-msg", message);
  assert.equal(result.code, 0);
  assert.equal(await scanCount(f) - before, 1, "only the new final message needs scanning");
});

for (const changed of ["code", "policy", "index"]) {
  test("CLI commit-msg invalidates the receipt after staged " + changed + " changes", async (t) => {
    const f = await fixture(t);
    const message = join(f.root, ".git", "proposed-message.txt");
    await writeFile(message, "A reviewed synthetic message.\n");
    assert.equal((await cli(f, "pre-commit")).code, 0);
    if (changed === "code") {
      await appendFile(join(f.root, "scripts", "sensitive-data", "gate.mjs"), "\n// Reviewed fixture change.\n");
    } else if (changed === "policy") {
      await writeFile(join(f.root, "scripts", "sensitive-data", "policy.json"), JSON.stringify({
        version: 2,
        exceptions: [],
        artifacts: [{
          pathSha256: createHash("sha256").update("synthetic-reviewed.bin").digest("hex"),
          sha256: "b".repeat(64), disposition: "visual-and-metadata-review",
          reviewedBySha256: createHash("sha256").update("fixture-review").digest("hex"),
          reviewedAt: "2020-01-01",
        }],
      }));
    } else {
      await writeFile(join(f.root, "lesson.txt"), "A different reviewed learning example.\n");
    }
    await f.git("add", ".");
    const before = await scanCount(f);
    const result = await cli(f, "commit-msg", message);
    assert.equal(result.code, 0);
    assert.equal(await scanCount(f) - before, 2, "changed tree/controls and final message must both be scanned");
  });
}

test("CLI refuses unstaged gate controls instead of trusting a mismatched receipt", async (t) => {
  const f = await fixture(t);
  assert.equal((await cli(f, "pre-commit")).code, 0);
  await appendFile(join(f.root, "scripts", "sensitive-data", "gate.mjs"), "\n// Unstaged fixture change.\n");
  const message = join(f.root, ".git", "proposed-message.txt");
  await writeFile(message, "A reviewed synthetic message.\n");
  const result = await cli(f, "commit-msg", message);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Publication blocked/);
  assertRedacted(result);
});

test("CLI missing tools fail closed with a redacted error", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.root, ".git", "fixture-detector.json"), JSON.stringify({ missingTool: true }));
  const result = await cli(f, "staged");
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Publication blocked/);
  assert.equal(result.stdout, "");
  assertRedacted(result);
});

test("CLI scans UTF-8 BOM artifacts without changing their hashed bytes", async (t) => {
  const f = await fixture(t);
  const target = join(f.root, "publication.txt");
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  await writeFile(target, Buffer.concat([bom, Buffer.from("Reviewed public draft.\n")]));
  const clean = await cli(f, "artifact", target);
  assert.equal(clean.code, 0);
  assert.equal(report(clean).passed, true);

  await writeFile(target, Buffer.concat([bom, Buffer.from(marker)]));
  const sensitive = await cli(f, "artifact", target);
  assert.equal(sensitive.code, 1);
  assert.equal(report(sensitive).passed, false);
  assert.ok(report(sensitive).findings.some((finding) => finding.rule === "EMAIL_ADDRESS"));
  assertRedacted(sensitive);
});

test("CLI rejects an artifact changed while its snapshot is being scanned", async (t) => {
  const f = await fixture(t);
  const target = join(f.root, "publication.txt");
  await writeFile(target, "Reviewed public publication draft.\n");
  await writeFile(join(f.root, ".git", "fixture-detector.json"), JSON.stringify({
    mutateArtifact: "publication.txt",
  }));
  const result = await cli(f, "artifact", target);
  assert.equal(await readFile(target, "utf8"), marker, "fixture mutation must have occurred");
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Publication blocked/);
  assertRedacted(result);
});
