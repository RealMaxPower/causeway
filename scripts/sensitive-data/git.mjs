import { lstat, readlink } from "node:fs/promises";
import path from "node:path";
import {
  OID, hash, failure, git, text, repository, objectData, bufferData,
  Snapshot, nulRecords, fileData,
} from "./git-snapshot.mjs";
import { addObjectMetadata, stableIdentity } from "./git-metadata.mjs";

export { isBinaryPayload } from "./git-snapshot.mjs";

async function scanTree(root, snapshot, treeish) {
  if (snapshot.trees.has(treeish)) return;
  snapshot.trees.add(treeish);
  // Include tree entries too: an explicitly stored empty directory tree can
  // have a sensitive name even though it has no descendant blobs.
  const entries = nulRecords(await git(root, ["ls-tree", "-r", "-t", "-z", "--full-tree", treeish]));
  for (const entry of entries) {
    const tab = entry.indexOf(9);
    if (tab < 0) throw failure();
    const header = text(entry.subarray(0, tab));
    const match = /^(\d{6}) (blob|tree|commit) ([a-f0-9]{40}|[a-f0-9]{64})$/u.exec(header);
    if (!match) throw failure();
    const [, mode, type, oid] = match;
    const filePath = snapshot.filename(entry.subarray(tab + 1));
    if (mode === "040000" && type === "tree") continue;
    if (mode === "160000" && type === "commit") {
      // A gitlink's payload is its target object identifier, not a local file.
      snapshot.reject(filePath, "submodule", hash(Buffer.from(oid, "hex")));
      continue;
    }
    if (type !== "blob" || !["100644", "100755", "120000"].includes(mode)) throw failure();
    if (!snapshot.blobs.has(oid)) snapshot.blobs.set(oid, await objectData(root, oid, "blob"));
    snapshot.add(filePath, snapshot.blobs.get(oid), "blob", mode === "120000" ? "symlink" : undefined);
  }
}

async function resolveObject(root, revision) {
  if (typeof revision !== "string" || !revision || revision.includes("\0") || revision.startsWith("-")) throw failure();
  const oid = text(await git(root, ["rev-parse", "--verify", "--end-of-options", `${revision}^{object}`])).trim();
  if (!OID.test(oid)) throw failure();
  return oid;
}

async function peel(root, snapshot, initial, scan) {
  let oid = initial;
  let expectedType;
  const seen = new Set();
  while (true) {
    if (seen.has(oid)) throw failure();
    seen.add(oid);
    const type = text(await git(root, ["cat-file", "-t", oid])).trim();
    if (expectedType && type !== expectedType) throw failure();
    if (type !== "tag") {
      if (!["commit", "tree", "blob"].includes(type)) throw failure();
      return { oid, type };
    }
    const data = await objectData(root, oid, "tag");
    let target;
    if (scan) {
      const declared = addObjectMetadata(snapshot, data, "tag");
      target = declared.oid;
      expectedType = declared.type;
      snapshot.tags.add(oid);
    } else {
      expectedType = undefined;
      // Excluded objects are not published, but must still resolve locally.
      const firstLine = data.bytes?.subarray(0, data.bytes.indexOf(10)).toString("ascii");
      target = firstLine && /^object ([a-f0-9]{40}|[a-f0-9]{64})$/u.exec(firstLine)?.[1];
      if (!target) throw failure();
    }
    oid = target;
  }
}

async function scanSelection(root, snapshot, positives, negatives = []) {
  const include = [];
  const exclude = [];
  for (const oid of positives) {
    const object = await peel(root, snapshot, oid, true);
    if (object.type === "commit") include.push(object.oid);
    else if (object.type === "tree") await scanTree(root, snapshot, object.oid);
    else snapshot.add(`@git/blob/${object.oid}`, await objectData(root, object.oid, "blob"), "blob");
  }
  for (const oid of negatives) {
    const object = await peel(root, snapshot, oid, false);
    if (object.type === "commit") exclude.push(object.oid);
  }
  if (!include.length) return;
  const commits = text(await git(root, [
    "rev-list", "--topo-order", ...include,
    ...(exclude.length ? ["--not", ...exclude] : []), "--",
  ])).trim().split("\n").filter(Boolean).sort();
  for (const oid of commits) {
    if (!OID.test(oid)) throw failure();
    addObjectMetadata(snapshot, await objectData(root, oid, "commit"), "commit");
    // Scan every introduced commit tree, not just the tip/diff: material
    // added and then deleted, side branches and merge resolutions all count.
    await scanTree(root, snapshot, oid);
  }
}

/** Capture exact staged content, including force-added ignored files. */
export async function collectIndex(root) {
  root = await repository(root);
  const tree = text(await git(root, ["write-tree"])).trim();
  if (!OID.test(tree)) throw failure();
  const snapshot = new Snapshot();
  await scanTree(root, snapshot, tree);
  return snapshot.finish({ kind: "index", tree });
}

/** Revisions support commitish names/OIDs, A..B, ^A, --not and --all. */
export async function collectHistory(root, { revisions } = {}) {
  root = await repository(root, { history: true });
  const items = revisions === undefined ? ["--all"] : typeof revisions === "string" ? [revisions] : revisions;
  if (!Array.isArray(items) || !items.length) throw failure();
  const snapshot = new Snapshot();
  const positives = [];
  const negatives = [];
  let negate = false;
  for (const item of items) {
    if (typeof item !== "string") throw failure();
    if (item === "--not") { negate = !negate; continue; }
    if (item === "--all") {
      const refs = text(await git(root, ["for-each-ref", "--format=%(objectname) %(refname)"])).trim().split("\n").filter(Boolean);
      for (const ref of refs) {
        const space = ref.indexOf(" ");
        const oid = ref.slice(0, space);
        if (space < 0 || !OID.test(oid)) throw failure();
        (negate ? negatives : positives).push(oid);
        if (!negate) snapshot.add(`@git/ref/${hash(ref.slice(space + 1))}`, bufferData(Buffer.from(ref.slice(space + 1))), "metadata");
      }
      // Match rev-list --all's inclusion of a detached HEAD. An unborn HEAD
      // has no object yet and is the only allowed missing result here.
      const head = await git(root, ["rev-parse", "--verify", "-q", "HEAD^{object}"], { allowMissing: true });
      if (head) {
        const oid = text(head).trim();
        if (!OID.test(oid)) throw failure();
        (negate ? negatives : positives).push(oid);
      }
      continue;
    }
    if (item.includes("...")) throw failure();
    const range = item.split("..");
    if (range.length === 2) {
      const before = await resolveObject(root, range[0] || "HEAD");
      const after = await resolveObject(root, range[1] || "HEAD");
      (negate ? positives : negatives).push(before);
      (negate ? negatives : positives).push(after);
    } else if (range.length === 1) {
      const caret = item.startsWith("^");
      const oid = await resolveObject(root, caret ? item.slice(1) : item);
      (negate !== caret ? negatives : positives).push(oid);
    } else throw failure();
  }
  if (!positives.length && !items.includes("--all")) throw failure();
  await scanSelection(root, snapshot, positives, negatives);
  return snapshot.finish({ kind: "history", positives: [...new Set(positives)].sort(), negatives: [...new Set(negatives)].sort() });
}

/** Read all four-column updates from Git's pre-push stdin; never fetch. */
export async function collectPush(root, stdin) {
  root = await repository(root, { history: true });
  const input = Buffer.isBuffer(stdin) ? text(stdin) : stdin;
  if (typeof input !== "string") throw failure();
  const snapshot = new Snapshot();
  const updates = [];
  for (const line of input.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const fields = line.trim().split(/\s+/u);
    if (fields.length !== 4) throw failure();
    const [localRef, localOid, remoteRef, remoteOid] = fields;
    if (!OID.test(localOid) || !OID.test(remoteOid) || localOid.length !== remoteOid.length) throw failure();
    updates.push(fields);
    if (/^0+$/u.test(localOid)) continue; // Deletions upload no objects.
    for (const ref of [localRef, remoteRef]) {
      snapshot.add(`@git/ref/${hash(ref)}`, bufferData(Buffer.from(ref)), "metadata");
    }
    const current = await resolveObject(root, localOid);
    const prior = /^0+$/u.test(remoteOid) ? [] : [await resolveObject(root, remoteOid)];
    // Compute each update independently: another ref's old tip must not
    // accidentally exclude the commits introduced by this update.
    await scanSelection(root, snapshot, [current], prior);
  }
  updates.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  return snapshot.finish({ kind: "push", updates });
}

/** Review tracked current files plus nonignored untracked files, without staging. */
export async function collectWorktree(root) {
  root = await repository(root);
  const snapshot = new Snapshot();
  const files = nulRecords(await git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]));
  const gitlinks = new Map();
  for (const entry of nulRecords(await git(root, ["ls-files", "--stage", "-z"]))) {
    const tab = entry.indexOf(9);
    if (tab < 0) throw failure();
    const header = text(entry.subarray(0, tab));
    const match = /^160000 ([a-f0-9]{40}|[a-f0-9]{64}) [0-3]$/u.exec(header);
    if (match) gitlinks.set(entry.subarray(tab + 1).toString("hex"), match[1]);
  }
  const unique = new Map(files.map((raw) => [raw.toString("hex"), raw]));
  for (const raw of unique.values()) {
    const filePath = snapshot.filename(raw);
    try { text(raw); } catch { continue; }
    const gitlink = gitlinks.get(raw.toString("hex"));
    if (gitlink) {
      snapshot.reject(filePath, "submodule", hash(Buffer.from(gitlink, "hex")));
      continue;
    }
    const segments = filePath.split("/");
    if (path.isAbsolute(filePath) || segments.some((part) => !part || part === "." || part === "..")) throw failure();
    let unsafeParent = false;
    let missingParent = false;
    for (let i = 1; i < segments.length; i++) {
      try {
        const parent = await lstat(path.join(root, ...segments.slice(0, i)));
        if (!parent.isDirectory() || parent.isSymbolicLink()) { unsafeParent = true; break; }
      } catch (error) {
        if (error.code === "ENOENT") { missingParent = true; break; }
        throw failure();
      }
    }
    if (missingParent) continue;
    if (unsafeParent) {
      snapshot.reject(filePath, "unavailable-parent", hash(raw));
      continue;
    }
    const file = path.join(root, filePath);
    let stat;
    try { stat = await lstat(file); }
    catch (error) {
      if (error.code === "ENOENT") continue; // Tracked file deleted in the worktree.
      throw failure();
    }
    if (stat.isSymbolicLink()) {
      let target;
      try { target = await readlink(file, { encoding: "buffer" }); }
      catch { throw failure(); }
      snapshot.reject(filePath, "symlink", hash(target));
    } else if (!stat.isFile()) {
      snapshot.reject(filePath, stat.isDirectory() ? "submodule-or-directory" : "special-file", hash(raw));
    } else {
      snapshot.add(filePath, await fileData(file), "blob");
    }
  }
  return snapshot.finish({ kind: "worktree" });
}

/** Final commit message and the identities Git intends to put in the commit. */
export async function collectMessage(root, messagePath) {
  root = await repository(root);
  if (typeof messagePath !== "string" || !messagePath) throw failure();
  const snapshot = new Snapshot();
  snapshot.add("@git/message", await fileData(path.resolve(root, messagePath)), "metadata");
  for (const [name, variable] of [["author", "GIT_AUTHOR_IDENT"], ["committer", "GIT_COMMITTER_IDENT"]]) {
    snapshot.add(`@git/${name}`, bufferData(stableIdentity(await git(root, ["var", variable]))), "metadata");
  }
  return snapshot.finish({ kind: "message" });
}
