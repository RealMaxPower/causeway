import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);
const MAX_BYTES = 2 * 1024 * 1024;
export const OID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const failure = () => new Error("Git snapshot collection failed; publication is blocked.");

/** Known nontext formats stay unsupported even when their bytes are ASCII. */
export function isBinaryPayload(filePath, bytes) {
  if (/\.(?:pdf|png|jpe?g|gif|webp|ico|avif|heic|woff2?|ttf|otf|eot|zip|gz|tgz|bz2|xz|7z|tar|docx?|pptx?|xlsx?|mp3|mp4|mov|webm|ogg|wav|wasm|sqlite3?|db|exe|dll|so|dylib|bin)$/iu.test(filePath)) return true;
  if (/^\s*%PDF-/u.test(bytes.subarray(0, 1024).toString("ascii"))) return true;
  try {
    return /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/u.test(decoder.decode(bytes));
  } catch {
    return true;
  }
}

function environment() {
  return {
    ...process.env,
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_NO_LAZY_FETCH: "1",
    GIT_GRAFT_FILE: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_PAGER: "cat",
  };
}

function argsFor(args) {
  return ["--no-pager", "--no-replace-objects", ...args];
}

export async function git(root, args, { allowMissing = false } = {}) {
  try {
    const result = await exec("git", argsFor(args), {
      cwd: root,
      env: environment(),
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    });
    return result.stdout;
  } catch (error) {
    if (allowMissing && error.code === 1) return null;
    // Never expose git's stderr, argv, environment, or original error/cause.
    throw failure();
  }
}

export function text(bytes) {
  try {
    return decoder.decode(bytes);
  } catch {
    throw failure();
  }
}

export async function repository(root, { history = false } = {}) {
  try {
    const actual = await realpath(root);
    const reported = text(await git(root, ["rev-parse", "--show-toplevel"])).trimEnd();
    if (actual !== await realpath(reported)) throw failure();
    // Partial clones can fetch objects implicitly on older Git versions.
    // Reject them rather than risk network access during local collection.
    const partial = await git(root, [
      "config", "--get-regexp", "^(extensions\\.partialclone|remote\\..*\\.promisor)$",
    ], { allowMissing: true });
    if (partial?.length) throw failure();
    if (history && text(await git(root, ["rev-parse", "--is-shallow-repository"])).trim() !== "false") {
      throw failure();
    }
    return actual;
  } catch {
    throw failure();
  }
}

async function digestStream(stream) {
  const digest = createHash("sha256");
  const chunks = [];
  let length = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    digest.update(bytes);
    if (length <= MAX_BYTES) chunks.push(bytes);
    else chunks.length = 0;
  }
  return {
    sha256: digest.digest("hex"),
    length,
    bytes: length <= MAX_BYTES ? Buffer.concat(chunks) : null,
  };
}

export async function objectData(root, oid, type) {
  if (!OID.test(oid) || !["blob", "commit", "tag"].includes(type)) throw failure();
  const child = spawn("git", argsFor(["cat-file", type, oid]), {
    cwd: root,
    env: environment(),
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
  const done = new Promise((resolve, reject) => {
    child.once("error", () => reject(failure()));
    child.once("close", (code) => code === 0 ? resolve() : reject(failure()));
  });
  try {
    const [result] = await Promise.all([digestStream(child.stdout), done]);
    return result;
  } catch {
    child.kill("SIGKILL");
    throw failure();
  } finally {
    clearTimeout(timer);
  }
}

export function bufferData(bytes) {
  return { bytes: bytes.length <= MAX_BYTES ? bytes : null, length: bytes.length, sha256: hash(bytes) };
}

export class Snapshot {
  records = new Map();
  unsupported = new Map();
  blobs = new Map();
  trees = new Set();
  tags = new Set();

  reject(filePath, reason, sha256) {
    this.unsupported.set(hash(JSON.stringify([filePath, reason, sha256])), {
      path: filePath, reason, sha256,
    });
  }

  add(filePath, data, kind = "text", forcedReason) {
    if (forcedReason) {
      this.reject(filePath, forcedReason, data.sha256);
      return;
    }
    if (data.length > MAX_BYTES) {
      this.reject(filePath, "size-limit", data.sha256);
      return;
    }
    if (kind === "blob" && isBinaryPayload(filePath, data.bytes)) {
      this.reject(filePath, "binary", data.sha256);
      return;
    }
    let content;
    try {
      content = decoder.decode(data.bytes);
    } catch {
      this.reject(filePath, kind === "blob" ? "binary" : "invalid-utf8", data.sha256);
      return;
    }
    if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/u.test(content)) {
      this.reject(filePath, "binary", data.sha256);
      return;
    }
    if (kind === "blob" && /^version https:\/\/git-lfs\.github\.com\/spec\/v1(?:\r?\n|$)/u.test(content)) {
      this.reject(filePath, "lfs-pointer", data.sha256);
      return;
    }
    const id = `${kind}:${hash(JSON.stringify([filePath, data.sha256]))}`;
    this.records.set(id, { id, path: filePath, content, sha256: data.sha256 });
  }

  filename(raw) {
    let filePath;
    try {
      filePath = decoder.decode(raw);
    } catch {
      filePath = `@git/path/${hash(raw)}`;
      this.reject(filePath, "invalid-utf8-path", hash(raw));
      return filePath;
    }
    this.add(filePath, bufferData(raw), "path");
    return filePath;
  }

  finish(scope) {
    const byId = ([a], [b]) => a < b ? -1 : a > b ? 1 : 0;
    const records = [...this.records.entries()].sort(byId).map(([, value]) => value);
    const unsupported = [...this.unsupported.entries()].sort(byId).map(([, value]) => value);
    const identity = hash(JSON.stringify({
      format: 1, scope,
      records: records.map(({ id, path: filePath, sha256 }) => [id, filePath, sha256]),
      unsupported,
    }));
    return { records, unsupported, identity };
  }
}

export function nulRecords(buffer) {
  const records = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) {
      records.push(buffer.subarray(start, i));
      start = i + 1;
    }
  }
  if (start !== buffer.length) throw failure();
  return records;
}

export async function fileData(file) {
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
    const before = await handle.stat();
    if (!before.isFile()) throw failure();
    const data = await digestStream(handle.createReadStream({ autoClose: false }));
    const after = await handle.stat();
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || data.length !== after.size) throw failure();
    return data;
  } catch {
    throw failure();
  } finally {
    try { await handle?.close(); } catch { throw failure(); }
  }
}

