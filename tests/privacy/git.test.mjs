import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectHistory,
  collectIndex,
  collectMessage,
  collectPush,
  collectWorktree,
  isBinaryPayload,
} from "../../scripts/sensitive-data/git.mjs";

const ZERO = "0".repeat(40);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const has = (snapshot, fragment) => snapshot.records.some((record) => record.content.includes(fragment));

function git(root, ...args) {
  const input = Buffer.isBuffer(args.at(-1)) ? args.pop() : undefined;
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  Object.assign(env, {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_AUTHOR_NAME: "Synthetic Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Synthetic Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_AUTHOR_DATE: "2001-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2001-01-01T00:00:00Z",
    GIT_TERMINAL_PROMPT: "0",
  });
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], {
    cwd: root, env, input, encoding: "utf8", stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
  }).trimEnd();
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "causeway-git-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Synthetic Fixture");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "config", "tag.gpgsign", "false");
  assert.equal(git(root, "remote"), "");
  return root;
}

async function file(root, name, content) {
  const target = path.join(root, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function commit(root, name, content, message = "Synthetic fixture commit") {
  await file(root, name, content);
  git(root, "add", "--", name);
  git(root, "commit", "-m", message);
  return git(root, "rev-parse", "HEAD");
}

test("index scans staged bytes even when an unstaged cleanup hides them", async (t) => {
  const root = await fixture(t);
  await file(root, "data.txt", "SYNTHETIC_STAGED_PRIVATE_MARKER\n");
  git(root, "add", "data.txt");
  await file(root, "data.txt", "clean worktree\n");
  const snapshot = await collectIndex(root);
  assert.equal(has(snapshot, "SYNTHETIC_STAGED_PRIVATE_MARKER"), true);
  assert.equal(has(snapshot, "clean worktree"), false);
  assert.deepEqual(snapshot.unsupported, []);
  assert.equal(snapshot.records.find((record) => record.id.startsWith("blob:")).sha256, sha("SYNTHETIC_STAGED_PRIVATE_MARKER\n"));
  assert.equal((await collectIndex(root)).identity, snapshot.identity);
  git(root, "add", "data.txt");
  assert.notEqual((await collectIndex(root)).identity, snapshot.identity);
});

test("history includes content deleted later, commit messages and both identities", async (t) => {
  const root = await fixture(t);
  const base = await commit(root, "base.txt", "base");
  await commit(root, "private.txt", "SYNTHETIC_DELETED_PRIVATE_MARKER", "Synthetic message marker");
  git(root, "rm", "private.txt");
  git(root, "commit", "-m", "Synthetic deletion");
  const snapshot = await collectHistory(root, { revisions: `${base}..HEAD` });
  assert.equal(has(snapshot, "SYNTHETIC_DELETED_PRIVATE_MARKER"), true);
  assert.match(snapshot.records.find((record) => record.path === "@git/author").content, /^Synthetic Fixture <fixture@example\.invalid>\n$/u);
  assert.match(snapshot.records.find((record) => record.path === "@git/committer").content, /^Synthetic Fixture <fixture@example\.invalid>\n$/u);
  assert.equal(snapshot.records.some((record) => record.path === "@git/message" && record.content === "Synthetic message marker\n"), true);
});

test("every merge parent and merge-resolution tree is scanned", async (t) => {
  const root = await fixture(t);
  const base = await commit(root, "base.txt", "base");
  git(root, "checkout", "-b", "side");
  await commit(root, "side.txt", "SYNTHETIC_SIDE_MARKER", "Synthetic side commit");
  git(root, "checkout", "main");
  await commit(root, "main.txt", "SYNTHETIC_MAIN_MARKER");
  git(root, "merge", "--no-ff", "side", "-m", "Synthetic merge marker");
  const merge = git(root, "rev-parse", "HEAD");
  const snapshot = await collectHistory(root, { revisions: [merge, "--not", base] });
  assert.equal(has(snapshot, "SYNTHETIC_SIDE_MARKER"), true);
  assert.equal(has(snapshot, "SYNTHETIC_MAIN_MARKER"), true);
  assert.equal(has(snapshot, "Synthetic merge marker"), true);
  assert.equal(snapshot.records.some((record) => record.path === "@git/message" && record.content === "Synthetic side commit\n"), true);
  assert.equal(snapshot.records.filter((record) => record.path === "side.txt" && record.id.startsWith("blob:")).length, 1);
});

test("multi-ref push scans each actual update without cross-ref exclusions", async (t) => {
  const root = await fixture(t);
  const base = await commit(root, "base.txt", "base");
  git(root, "checkout", "-b", "side");
  const side = await commit(root, "side.txt", "SYNTHETIC_MULTIREF_MARKER");
  git(root, "checkout", "main");
  const main = await commit(root, "main.txt", "main");
  // side was already the old tip of another ref, but is newly introduced
  // into the first remote ref. Global --not exclusions would miss it.
  const updates = `refs/heads/side ${side} refs/heads/release ${base}\nrefs/heads/main ${main} refs/heads/main ${side}\n`;
  const snapshot = await collectPush(root, updates);
  assert.equal(has(snapshot, "SYNTHETIC_MULTIREF_MARKER"), true);
  assert.equal(has(snapshot, "refs/heads/release"), true);
  assert.equal(has(snapshot, "refs/heads/main"), true);
  const reversed = updates.trim().split("\n").reverse().join("\n") + "\n";
  assert.equal((await collectPush(root, reversed)).identity, snapshot.identity);
});

test("new branches conservatively scan all reachable history; deletions scan nothing", async (t) => {
  const root = await fixture(t);
  await commit(root, "gone.txt", "SYNTHETIC_ANCESTOR_MARKER");
  git(root, "rm", "gone.txt");
  git(root, "commit", "-m", "Synthetic removal");
  const tip = git(root, "rev-parse", "HEAD");
  const snapshot = await collectPush(root, `refs/heads/main ${tip} refs/heads/new ${ZERO}\n`);
  assert.equal(has(snapshot, "SYNTHETIC_ANCESTOR_MARKER"), true);
  const deletion = await collectPush(root, `(delete) ${ZERO} refs/heads/old ${tip}\n`);
  assert.deepEqual(deletion.records, []);
  assert.deepEqual(deletion.unsupported, []);
});

test("force pushes scan divergent introduced commits, including later deletions", async (t) => {
  const root = await fixture(t);
  const base = await commit(root, "base.txt", "base");
  const old = await commit(root, "old.txt", "SYNTHETIC_OLD_ONLY_MARKER");
  git(root, "checkout", "-b", "rewrite", base);
  await commit(root, "gone.txt", "SYNTHETIC_FORCE_PRIVATE_MARKER");
  git(root, "rm", "gone.txt");
  git(root, "commit", "-m", "Synthetic cleanup");
  const current = git(root, "rev-parse", "HEAD");
  const snapshot = await collectPush(root, `refs/heads/rewrite ${current} refs/heads/main ${old}\n`);
  assert.equal(has(snapshot, "SYNTHETIC_FORCE_PRIVATE_MARKER"), true);
  assert.equal(has(snapshot, "SYNTHETIC_OLD_ONLY_MARKER"), false);
});

test("annotated tags, nested tags, tagger identities and ref names are scanned", async (t) => {
  const root = await fixture(t);
  await commit(root, "base.txt", "base");
  git(root, "tag", "-a", "inner", "-m", "SYNTHETIC_INNER_TAG_MARKER");
  git(root, "tag", "-a", "outer", "inner", "-m", "SYNTHETIC_OUTER_TAG_MARKER");
  const tip = git(root, "rev-parse", "outer");
  const snapshot = await collectPush(root, `refs/tags/outer ${tip} refs/tags/fixture@example.invalid ${ZERO}\n`);
  assert.equal(has(snapshot, "SYNTHETIC_INNER_TAG_MARKER"), true);
  assert.equal(has(snapshot, "SYNTHETIC_OUTER_TAG_MARKER"), true);
  assert.equal(snapshot.records.some((record) => record.path === "@git/tagger" && record.content === "Synthetic Fixture <fixture@example.invalid>\n"), true);
  assert.equal(has(snapshot, "refs/tags/fixture@example.invalid"), true);
});

test("tags pointing to trees or blobs scan their noncommit payloads", async (t) => {
  const root = await fixture(t);
  await commit(root, "payload.txt", "SYNTHETIC_TAG_PAYLOAD");
  git(root, "tag", "-a", "tree-tag", "HEAD^{tree}", "-m", "Synthetic tree tag");
  git(root, "tag", "-a", "blob-tag", "HEAD:payload.txt", "-m", "Synthetic blob tag");
  const treeTag = git(root, "rev-parse", "tree-tag");
  const blobTag = git(root, "rev-parse", "blob-tag");
  const snapshot = await collectPush(root, `refs/tags/tree-tag ${treeTag} refs/tags/tree-tag ${ZERO}\nrefs/tags/blob-tag ${blobTag} refs/tags/blob-tag ${ZERO}\n`);
  assert.equal(has(snapshot, "SYNTHETIC_TAG_PAYLOAD"), true);
  assert.equal(has(snapshot, "Synthetic tree tag"), true);
  assert.equal(has(snapshot, "Synthetic blob tag"), true);
  assert.deepEqual(snapshot.unsupported, []);
});

test("force-added ignored files are included and worktree review never stages", async (t) => {
  const root = await fixture(t);
  await file(root, ".gitignore", ".env\n");
  git(root, "add", ".gitignore");
  await file(root, ".env", "SYNTHETIC_FORCE_ADDED_MARKER");
  await file(root, "docs/new.txt", "SYNTHETIC_UNTRACKED_MARKER");
  const before = git(root, "write-tree");
  const worktree = await collectWorktree(root);
  assert.equal(has(worktree, "SYNTHETIC_FORCE_ADDED_MARKER"), false);
  assert.equal(has(worktree, "SYNTHETIC_UNTRACKED_MARKER"), true);
  assert.equal(git(root, "write-tree"), before);
  git(root, "add", "-f", ".env");
  assert.equal(has(await collectIndex(root), "SYNTHETIC_FORCE_ADDED_MARKER"), true);
  assert.equal(has(await collectWorktree(root), "SYNTHETIC_FORCE_ADDED_MARKER"), true);
});

test("filenames are independent detector inputs, including tabs and newlines", async (t) => {
  const root = await fixture(t);
  const name = "docs/fixture@example.invalid\tname\n.txt";
  await file(root, name, "innocent content");
  git(root, "add", "--", name);
  const snapshot = await collectIndex(root);
  const filename = snapshot.records.find((record) => record.id.startsWith("path:") && record.content === name);
  assert.ok(filename);
  assert.equal(filename.sha256, sha(name));
  assert.equal(snapshot.records.find((record) => record.id.startsWith("blob:")).path, name);
});

test("valid filenames resembling metadata paths are not excluded from worktree scans", async (t) => {
  const root = await fixture(t);
  await file(root, "@git/path/visible.txt", "SYNTHETIC_PREFIX_COLLISION_MARKER");
  assert.equal(has(await collectWorktree(root), "SYNTHETIC_PREFIX_COLLISION_MARKER"), true);
});

test("invalid UTF-8 filenames remain unsupported without lossy replacement", async (t) => {
  const root = await fixture(t);
  // Build an index entry directly because macOS rejects such filesystem names.
  const blob = git(root, "hash-object", "-w", "--stdin", Buffer.from("synthetic content"));
  const entry = Buffer.concat([Buffer.from(`100644 blob ${blob}\tname-`), Buffer.from([0xff, 0])]);
  const tree = git(root, "mktree", "-z", entry);
  git(root, "read-tree", tree);
  const snapshot = await collectIndex(root);
  assert.ok(snapshot.unsupported.some((record) => record.reason === "invalid-utf8-path"));
  assert.ok((await collectWorktree(root)).unsupported.some((record) => record.reason === "invalid-utf8-path"));
});

test("binary classifier does not mistake source text mentioning PDF for a document", () => {
  assert.equal(isBinaryPayload("source.mjs", Buffer.from('const fixture = "%PDF-1.7";')), false);
  assert.equal(isBinaryPayload("notes.md", Buffer.from("Example header: %PDF-1.7")), false);
  assert.equal(isBinaryPayload("renamed.txt", Buffer.from("%PDF-1.7\nfixture")), true);
  assert.equal(isBinaryPayload("corrupt.tsx", Buffer.from([0xff])), true);
  assert.equal(isBinaryPayload("vector.svg", Buffer.from("<svg><text>Synthetic</text></svg>")), false);
});

test("binary, oversized, symlink, LFS and submodule artifacts fail closed with fingerprints", async (t) => {
  const root = await fixture(t);
  const base = await commit(root, "base.txt", "base");
  const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]);
  const big = Buffer.alloc(2 * 1024 * 1024 + 1, 97);
  await file(root, "binary.dat", binary);
  await file(root, "ascii-document.pdf", "%PDF-1.7\nSynthetic ASCII-only PDF fixture\n%%EOF\n");
  await file(root, "hidden-pdf.txt", "%PDF-1.7\nSynthetic ASCII-only PDF fixture\n%%EOF\n");
  await file(root, "large.txt", big);
  await file(root, "pointer.txt", `version https://git-lfs.github.com/spec/v1\noid sha256:${"a".repeat(64)}\nsize 123\n`);
  await symlink("base.txt", path.join(root, "link"));
  git(root, "add", "binary.dat", "ascii-document.pdf", "hidden-pdf.txt", "large.txt", "pointer.txt", "link");
  git(root, "update-index", "--add", "--cacheinfo", `160000,${base},module`);
  const snapshot = await collectIndex(root);
  const byPath = new Map(snapshot.unsupported.map((record) => [record.path, record]));
  assert.equal(byPath.get("binary.dat").reason, "binary");
  assert.equal(byPath.get("binary.dat").sha256, sha(binary));
  assert.equal(byPath.get("ascii-document.pdf").reason, "binary");
  assert.equal(byPath.get("hidden-pdf.txt").reason, "binary");
  assert.equal(byPath.get("large.txt").reason, "size-limit");
  assert.equal(byPath.get("large.txt").sha256, sha(big));
  assert.equal(byPath.get("pointer.txt").reason, "lfs-pointer");
  assert.equal(byPath.get("link").reason, "symlink");
  assert.equal(byPath.get("link").sha256, sha("base.txt"));
  assert.equal(byPath.get("module").reason, "submodule");
  const worktree = await collectWorktree(root);
  assert.equal(worktree.unsupported.some((record) => record.path === "module" && record.reason === "submodule"), true);
  assert.equal(worktree.unsupported.find((record) => record.path === "binary.dat").sha256, sha(binary));
});

test("worktree collection does not follow a replaced directory symlink", async (t) => {
  const root = await fixture(t);
  await file(root, "original/file.txt", "original");
  git(root, "add", "original/file.txt");
  const outside = await mkdtemp(path.join(os.tmpdir(), "causeway-outside-fixture-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await file(outside, "file.txt", "SYNTHETIC_OUTSIDE_MARKER");
  await rm(path.join(root, "original"), { recursive: true });
  await symlink(outside, path.join(root, "original"));
  const snapshot = await collectWorktree(root);
  assert.equal(has(snapshot, "SYNTHETIC_OUTSIDE_MARKER"), false);
  assert.ok(snapshot.unsupported.some((record) => record.reason === "unavailable-parent"));
});

test("deleted worktree directories do not fall back to staged content", async (t) => {
  const root = await fixture(t);
  await file(root, "gone/private.txt", "SYNTHETIC_DELETED_WORKTREE_MARKER");
  git(root, "add", "gone/private.txt");
  await rm(path.join(root, "gone"), { recursive: true });
  const snapshot = await collectWorktree(root);
  assert.equal(has(snapshot, "SYNTHETIC_DELETED_WORKTREE_MARKER"), false);
  assert.deepEqual(snapshot.unsupported, []);
});

test("message collector captures final text and intended author and committer", async (t) => {
  const root = await fixture(t);
  await file(root, ".git/COMMIT_EDITMSG", "SYNTHETIC_FINAL_MESSAGE_MARKER\n");
  const overrides = {
    GIT_AUTHOR_NAME: "Synthetic Author",
    GIT_AUTHOR_EMAIL: "author@example.invalid",
    GIT_COMMITTER_NAME: "Synthetic Committer",
    GIT_COMMITTER_EMAIL: "committer@example.invalid",
    GIT_AUTHOR_DATE: "2001-01-01T00:00:00Z",
    GIT_COMMITTER_DATE: "2001-01-01T00:00:00Z",
  };
  const original = Object.fromEntries(Object.keys(overrides).map((key) => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  try {
    const snapshot = await collectMessage(root, ".git/COMMIT_EDITMSG");
    assert.equal(has(snapshot, "SYNTHETIC_FINAL_MESSAGE_MARKER"), true);
    assert.equal(has(snapshot, "Synthetic Author <author@example.invalid>"), true);
    assert.equal(has(snapshot, "Synthetic Committer <committer@example.invalid>"), true);
    assert.deepEqual(snapshot.unsupported, []);
    process.env.GIT_AUTHOR_DATE = "2002-01-01T00:00:00Z";
    process.env.GIT_COMMITTER_DATE = "2002-01-01T00:00:00Z";
    assert.equal((await collectMessage(root, ".git/COMMIT_EDITMSG")).identity, snapshot.identity);
    process.env.GIT_AUTHOR_NAME = "Different Synthetic Author";
    assert.notEqual((await collectMessage(root, ".git/COMMIT_EDITMSG")).identity, snapshot.identity);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("default history includes a detached HEAD outside all branch refs", async (t) => {
  const root = await fixture(t);
  await commit(root, "base.txt", "base");
  git(root, "checkout", "--detach");
  await commit(root, "detached.txt", "SYNTHETIC_DETACHED_MARKER");
  assert.equal(has(await collectHistory(root), "SYNTHETIC_DETACHED_MARKER"), true);
});

test("all refs include annotated tag metadata and unique blob/path pairs", async (t) => {
  const root = await fixture(t);
  await commit(root, "base.txt", "base");
  git(root, "tag", "-a", "release", "-m", "SYNTHETIC_ALL_REFS_TAG");
  const snapshot = await collectHistory(root, { revisions: ["--all"] });
  assert.equal(has(snapshot, "SYNTHETIC_ALL_REFS_TAG"), true);
  assert.equal(has(snapshot, "refs/heads/main"), true);
  assert.equal(snapshot.records.filter((record) => record.path === "base.txt" && record.id.startsWith("blob:")).length, 1);
  assert.equal((await collectHistory(root)).identity, snapshot.identity);
  assert.equal((await collectHistory(root, { revisions: undefined })).identity, snapshot.identity);
});

test("missing objects and malformed revision input fail without leaking git diagnostics", async (t) => {
  const root = await fixture(t);
  const head = await commit(root, "base.txt", "base");
  for (const action of [
    () => collectHistory(root, { revisions: ["SYNTHETIC_PRIVATE_REVISION_MARKER"] }),
    () => collectHistory(root, { revisions: ["--output=SYNTHETIC_PRIVATE_REVISION_MARKER"] }),
    () => collectPush(root, `refs/heads/main ${head} refs/heads/main ${"f".repeat(40)}\n`),
    () => collectPush(root, "malformed SYNTHETIC_PRIVATE_REVISION_MARKER\n"),
  ]) {
    await assert.rejects(action, (error) => {
      assert.equal(error.message, "Git snapshot collection failed; publication is blocked.");
      assert.equal(error.cause, undefined);
      assert.equal(error.stderr, undefined);
      return true;
    });
  }
  assert.equal(git(root, "remote"), "");
});

test("shallow and partial repositories fail closed without any fetch", async (t) => {
  const root = await fixture(t);
  const head = await commit(root, "base.txt", "base");
  await file(root, ".git/shallow", `${head}\n`);
  await assert.rejects(() => collectHistory(root, { revisions: ["HEAD"] }), /publication is blocked/u);
  await assert.rejects(() => collectPush(root, `refs/heads/main ${head} refs/heads/main ${ZERO}\n`), /publication is blocked/u);
  await rm(path.join(root, ".git/shallow"));
  // No actual remote is configured; the extension alone must block collection.
  git(root, "config", "extensions.partialClone", "synthetic-unconfigured-provider");
  await assert.rejects(() => collectHistory(root, { revisions: ["HEAD"] }), /publication is blocked/u);
  assert.equal(git(root, "remote"), "");
  assert.equal(await readFile(path.join(root, "base.txt"), "utf8"), "base");
});
