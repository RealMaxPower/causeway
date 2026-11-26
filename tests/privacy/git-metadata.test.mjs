import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectHistory, collectMessage } from "../../scripts/sensitive-data/git.mjs";
import { addObjectMetadata, stableIdentity } from "../../scripts/sensitive-data/git-metadata.mjs";
import { Snapshot, bufferData } from "../../scripts/sensitive-data/git-snapshot.mjs";
import { classifyGitMachineFields } from "../../scripts/sensitive-data/machine-fields.mjs";

const PERSON = "Synthetic Fixture <fixture@example.invalid>";
const tree = "a".repeat(40);
const parent = "b".repeat(40);
const baseHeaders = `tree ${tree}\nauthor ${PERSON} 978307200 +0000\ncommitter ${PERSON} 978307201 -0700`;

function records(raw, type = "commit") {
  const snapshot = new Snapshot();
  addObjectMetadata(snapshot, bufferData(Buffer.from(raw)), type);
  return snapshot.finish({ kind: "test" }).records;
}

test("stable identity parsing removes only the terminal timestamp and timezone", () => {
  assert.equal(stableIdentity(Buffer.from(`${PERSON} 978307200 +0000\n`)).toString(), `${PERSON}\n`);
  assert.equal(stableIdentity(Buffer.from(`${PERSON} 1234567890 -0700\n`)).toString(), `${PERSON}\n`);
  assert.throws(() => stableIdentity(Buffer.from(`${PERSON}\nextra\n`)), /publication is blocked/u);
  assert.throws(() => stableIdentity(Buffer.from(`${PERSON} invalid\n`)), /publication is blocked/u);
});

test("commit records preserve complete messages, clocks and multiline extension headers", () => {
  const extension = "custom-header SYNTHETIC_HEADER_MARKER\n continuation SYNTHETIC_CONTINUATION_MARKER";
  const signature = "gpgsig -----BEGIN SYNTHETIC SIGNATURE-----\n \n fixture-payload\n -----END SYNTHETIC SIGNATURE-----";
  const message = "Synthetic subject\n\nDetailed synthetic message.\n";
  const raw = `${baseHeaders}\nparent ${parent}\n${extension}\n${signature}\n\n${message}`;
  const found = records(raw);
  const get = (name) => found.find((record) => record.path === name).content;
  assert.equal(get("@git/author"), `${PERSON}\n`);
  assert.equal(get("@git/committer"), `${PERSON}\n`);
  assert.equal(get("@git/message"), message);
  assert.equal(get("@git/commit/header/tree"), `tree ${tree}\n`);
  assert.equal(get("@git/commit/header/parent"), `parent ${parent}\n`);
  assert.equal(get("@git/commit/header/author-time"), "author 978307200 +0000\n");
  assert.equal(get("@git/commit/header/committer-time"), "committer 978307201 -0700\n");
  assert.equal(get("@git/commit/header/custom-header"), `${extension}\n`);
  assert.equal(get("@git/commit/header/gpgsig"), `${signature}\n`);
});

test("changing tree, parent and clock does not invalidate identical person/message records", () => {
  const first = records(`${baseHeaders}\n\nStable synthetic message\n`);
  const second = records(`${baseHeaders.replace(tree, parent).replace("978307200", "1234567890")}\nparent ${tree}\n\nStable synthetic message\n`);
  for (const name of ["@git/author", "@git/committer", "@git/message"]) {
    assert.deepEqual(first.find((record) => record.path === name), second.find((record) => record.path === name));
  }
});

test("only exact summaries matching two ordered commit parents get machine provenance", () => {
  for (const size of [40, 64]) {
    const first = "a".repeat(size), second = "b".repeat(size), third = "c".repeat(size);
    const summary = `Merge ${second} into ${first}\n`;
    const object = (parents, message) => records(`tree ${third}\n${parents.map((oid) => `parent ${oid}\n`).join("")}author ${PERSON} 978307200 +0000\ncommitter ${PERSON} 978307201 +0000\n\n${message}`);
    const valid = object([first, second], summary);
    const found = valid.find((record) => record.path === "@git/commit/merge-summary");
    assert.equal(found.content, summary);
    assert.ok(!valid.some((record) => record.path === "@git/message"));
    assert.deepEqual(classifyGitMachineFields(found), { machineGitNer: true, machineGitPhone: true });
    for (const [parents, message] of [
      [[], summary], [[first], summary], [[first, second, third], summary],
      [[second, first], summary], [[first, third], summary],
      [[first, second], `Merge ${third} into ${first}\n`],
      [[first, second], summary + "Synthetic suffix\n"],
      [[first, second], summary + "\n"],
      [[first, second], summary.trimEnd()],
      [[first, second], summary.replace("\n", "\r\n")],
      [[first, second], summary.replace("\n", " suffix\n")],
    ]) {
      const ordinary = object(parents, message);
      assert.ok(!ordinary.some((record) => record.path === "@git/commit/merge-summary"));
      const record = ordinary.find((item) => item.path === "@git/message");
      assert.equal(record.content, message);
      assert.deepEqual(classifyGitMachineFields(record), { machineGitNer: false, machineGitPhone: false });
    }
  }
  const mixed = records(`${baseHeaders}\nparent ${parent}\nparent ${"c".repeat(64)}\n\nMerge ${"c".repeat(64)} into ${parent}\n`);
  assert.ok(mixed.some((record) => record.path === "@git/message"));
  assert.ok(!mixed.some((record) => record.path === "@git/commit/merge-summary"));
});

test("tagger and tag message records stay stable while every tag header is preserved", () => {
  const tag = (target) => `object ${target}\ntype commit\ntag synthetic-release\ntagger ${PERSON} 978307200 +0000\ncustom-tag SYNTHETIC_TAG_HEADER\n continued-tag-field\n\nStable synthetic tag message\n`;
  const first = records(tag(tree), "tag");
  const second = records(tag(parent), "tag");
  for (const name of ["@git/tagger", "@git/tag/message"]) {
    assert.deepEqual(first.find((record) => record.path === name), second.find((record) => record.path === name));
  }
  assert.equal(first.find((record) => record.path === "@git/tag/header/tag").content, "tag synthetic-release\n");
  assert.equal(first.find((record) => record.path === "@git/tag/header/tagger-time").content, "tagger 978307200 +0000\n");
  assert.equal(first.find((record) => record.path === "@git/tag/header/custom-tag").content, "custom-tag SYNTHETIC_TAG_HEADER\n continued-tag-field\n");
});

test("malformed metadata is rejected without raw object content in errors", () => {
  const invalid = [
    baseHeaders,
    `${baseHeaders}\nauthor ${PERSON} 978307200 +0000\n\nmessage`,
    `tree ${tree}\nauthor ${PERSON} 978307200 +0000\n\nmessage`,
    `${baseHeaders}\nparent INVALID_SYNTHETIC_PARENT\n\nmessage`,
    `${baseHeaders.replace("978307200 +0000", "SYNTHETIC_BAD_DATE")}\n\nmessage`,
    `${baseHeaders}\n unrecognized-author-continuation\n\nmessage`,
    `${baseHeaders}\nINVALID_SYNTHETIC_HEADER\n\nmessage`,
    ` orphaned-continuation\n${baseHeaders}\n\nmessage`,
  ];
  for (const raw of invalid) {
    assert.throws(() => records(raw), (error) => error.message === "Git snapshot collection failed; publication is blocked.");
  }
  assert.throws(() => records(`object ${tree}\ntype unsupported\ntag test\n\nmessage`, "tag"), /publication is blocked/u);
  assert.throws(() => addObjectMetadata(new Snapshot(), bufferData(Buffer.from([0xff])), "commit"), /publication is blocked/u);
  assert.throws(() => addObjectMetadata(new Snapshot(), { bytes: null }, "commit"), /publication is blocked/u);
});

test("real hook and historical metadata produce identical person/message record fingerprints", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "causeway-metadata-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const saved = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("GIT_")));
  const isolated = {
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_AUTHOR_NAME: "Synthetic Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Synthetic Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_AUTHOR_DATE: "2001-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2001-01-01T00:00:00Z",
    GIT_TERMINAL_PROMPT: "0",
  };
  for (const key of Object.keys(saved)) delete process.env[key];
  Object.assign(process.env, isolated);
  try {
    const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
      cwd: root, env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    git("init", "-b", "main");
    assert.equal(git("remote"), "");
    await writeFile(path.join(root, "fixture.txt"), "Synthetic public content\n");
    git("add", "fixture.txt");
    git("commit", "-m", "Stable synthetic message");
    const hook = await collectMessage(root, ".git/COMMIT_EDITMSG");
    const history = await collectHistory(root);
    for (const name of ["@git/author", "@git/committer", "@git/message"]) {
      assert.deepEqual(hook.records.find((record) => record.path === name), history.records.find((record) => record.path === name));
    }
    assert.ok(history.records.some((record) => record.path === "@git/commit/header/author-time"));
    const base = git("rev-parse", "HEAD");
    const committedTree = git("rev-parse", "HEAD^{tree}");
    const head = git("commit-tree", committedTree, "-p", base, "-m", "Synthetic merged head");
    const summary = `Merge ${head} into ${base}\n`;
    const merge = git("commit-tree", committedTree, "-p", base, "-p", head, "-m", summary);
    const merged = await collectHistory(root, { revisions: [merge] });
    assert.equal(merged.records.find((record) => record.path === "@git/commit/merge-summary").content, summary);
    await writeFile(path.join(root, ".git/COMMIT_EDITMSG"), summary);
    const precommit = await collectMessage(root, ".git/COMMIT_EDITMSG");
    assert.ok(!precommit.records.some((record) => record.path === "@git/commit/merge-summary"));
    const message = precommit.records.find((record) => record.path === "@git/message");
    assert.equal(message.content, summary);
    assert.deepEqual(classifyGitMachineFields(message), { machineGitNer: false, machineGitPhone: false });
  } finally {
    for (const key of Object.keys(process.env)) if (key.startsWith("GIT_")) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
