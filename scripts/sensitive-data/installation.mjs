import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import path from "node:path";

const fail = () => new Error("Sensitive-data detector failed; publication is blocked.");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const digest = /^[a-f0-9]{64}$/;

async function fileHash(filename) {
  const value = createHash("sha256");
  for await (const chunk of createReadStream(filename)) value.update(chunk);
  return value.digest("hex");
}

async function regularFile(filename) {
  if (!(await lstat(filename)).isFile()) throw fail();
}

/** Verify installed bytes before any Python import or executable is launched. */
export async function verifyInstallation(root) {
  try {
    const scripts = path.join(root, "scripts", "sensitive-data");
    const tools = path.join(root, ".sensitive-data-tools");
    if (!(await lstat(tools)).isDirectory()) throw fail();
    const manifestBytes = await readFile(path.join(scripts, "tools.json"));
    const manifest = JSON.parse(manifestBytes);
    const stateFile = path.join(tools, "installation.json");
    await regularFile(stateFile);
    const state = JSON.parse(await readFile(stateFile));
    if (state.schemaVersion !== 2 || !/^install-[A-Za-z0-9_-]+$/.test(state.directory)
      || !digest.test(state.inventorySha256) || state.manifestSha256 !== hash(manifestBytes)
      || state.requirementsSha256 !== hash(await readFile(path.join(scripts, "requirements.txt")))) throw fail();
    const selected = path.join(tools, state.directory);
    if (!(await lstat(selected)).isDirectory()) throw fail();
    const directory = await realpath(selected);
    const inventoryFile = path.join(directory, "inventory.json");
    await regularFile(inventoryFile);
    const inventoryBytes = await readFile(inventoryFile);
    if (hash(inventoryBytes) !== state.inventorySha256) throw fail();
    const inventory = JSON.parse(inventoryBytes);
    if (!Array.isArray(inventory) || inventory.length === 0 || inventory.length > 100000) throw fail();
    const expected = new Map();
    for (const entry of inventory) {
      if (!entry || typeof entry.path !== "string" || !entry.path
        || entry.path.split("/").some((part) => !part || part === "." || part === "..")
        || entry.path.includes("\\") || expected.has(entry.path)
        || !["file", "directory", "symlink"].includes(entry.kind)
        || !Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777) throw fail();
      expected.set(entry.path, entry);
    }
    const walk = async (relative = "") => {
      for (const name of await readdir(path.join(directory, relative))) {
        const key = relative ? `${relative}/${name}` : name;
        if (key === "inventory.json") continue;
        const entry = expected.get(key);
        if (!entry) throw fail();
        expected.delete(key);
        const filename = path.join(directory, key), info = await lstat(filename);
        if ((info.mode & 0o777) !== entry.mode) throw fail();
        if (info.isSymbolicLink()) {
          // Venv directory aliases may be internal; external imports are forbidden.
          const target = await realpath(filename);
          if (entry.kind !== "symlink" || entry.target !== await readlink(filename)
            || !target.startsWith(`${directory}${path.sep}`)) throw fail();
        } else if (info.isDirectory()) {
          if (entry.kind !== "directory") throw fail();
          await walk(key);
        } else if (!info.isFile() || entry.kind !== "file" || !digest.test(entry.sha256)
          || entry.sha256 !== await fileHash(filename)) throw fail();
      }
    };
    await walk();
    if (expected.size) throw fail();
    const gitleaks = path.join(directory, "gitleaks"), python = path.join(directory, "python", "bin", "python");
    await regularFile(gitleaks);
    await regularFile(python);
    if (state.gitleaksSha256 !== await fileHash(gitleaks)) throw fail();
    return { scripts, tools: directory, manifest, gitleaks, python };
  } catch { throw fail(); }
}
