import { OID, bufferData, failure, text } from "./git-snapshot.mjs";

function identity(value) {
  const match = /^(.+ <[^<>\r\n]*>) (-?\d+) ([+-]\d{4})$/u.exec(value);
  if (!match) throw failure();
  return { person: match[1], clock: `${match[2]} ${match[3]}` };
}

/** Only the generated terminal clock is omitted from a pre-commit identity. */
export function stableIdentity(bytes) {
  const value = text(bytes);
  if (!value.endsWith("\n") || value.slice(0, -1).includes("\n")) throw failure();
  const parsed = identity(value.slice(0, -1));
  return Buffer.from(`${parsed.person}\n`);
}

function parse(bytes, type) {
  const raw = text(bytes);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(raw)) throw failure();
  const separator = raw.indexOf("\n\n");
  if (separator < 0) throw failure();
  const headers = [];
  for (const line of raw.slice(0, separator).split("\n")) {
    if (line.startsWith(" ")) {
      if (!headers.length) throw failure();
      headers.at(-1).lines.push(line);
      continue;
    }
    const match = /^([A-Za-z][A-Za-z0-9-]*) (.*)$/u.exec(line);
    if (!match) throw failure();
    headers.push({ name: match[1], value: match[2], lines: [line] });
  }
  const standard = type === "commit"
    ? ["tree", "parent", "author", "committer"]
    : ["object", "type", "tag", "tagger"];
  const required = type === "commit" ? ["tree", "author", "committer"] : ["object", "type", "tag"];
  if (headers[0]?.name !== required[0]) throw failure();
  for (const name of standard) {
    const matches = headers.filter((header) => header.name === name);
    if ((required.includes(name) && matches.length === 0) ||
        (name !== "parent" && matches.length > 1) ||
        matches.some((header) => header.lines.length !== 1)) throw failure();
  }
  for (const header of headers) {
    if (["tree", "parent", "object"].includes(header.name) && !OID.test(header.value)) throw failure();
    if (type === "tag" && header.name === "type" && !["commit", "tree", "blob", "tag"].includes(header.value)) throw failure();
    if (type === "tag" && header.name === "tag" && !header.value) throw failure();
  }
  return { headers, message: raw.slice(separator + 2) };
}

/**
 * Stable field records avoid a circular exception dependency: approving an
 * author must not change the identifier of the record being approved. Object
 * OIDs still bind the full immutable input in the enclosing snapshot identity.
 */
export function addObjectMetadata(snapshot, data, type) {
  if (!["commit", "tag"].includes(type) || !data.bytes) throw failure();
  const { headers, message } = parse(data.bytes, type);
  const add = (filePath, content) => snapshot.add(filePath, bufferData(Buffer.from(content)), "metadata");
  for (const header of headers) {
    const isPerson = type === "commit"
      ? ["author", "committer"].includes(header.name)
      : header.name === "tagger";
    if (isPerson) {
      const parsed = identity(header.value);
      add(`@git/${header.name}`, `${parsed.person}\n`);
      add(`@git/${type}/header/${header.name}-time`, `${header.name} ${parsed.clock}\n`);
    } else {
      // Unknown headers and every continuation line are retained verbatim.
      // Separate records prevent unrelated tree/parent changes from changing
      // a review fingerprint for an otherwise identical extension header.
      add(`@git/${type}/header/${header.name}`, `${header.lines.join("\n")}\n`);
    }
  }
  let messagePath = type === "commit" ? "@git/message" : "@git/tag/message";
  if (type === "commit") {
    const parents = headers.filter((header) => header.name === "parent").map((header) => header.value);
    // GitHub's generated summary names the merged head and then the base.
    // Only immutable commits with those exact ordered parents get this path;
    // a pre-commit message has no such provenance and stays fully scanned.
    if (parents.length === 2 && parents[0].length === parents[1].length &&
        message === `Merge ${parents[1]} into ${parents[0]}\n`) {
      messagePath = "@git/commit/merge-summary";
    }
  }
  add(messagePath, message);
  return type === "tag" ? {
    oid: headers.find((header) => header.name === "object").value,
    type: headers.find((header) => header.name === "type").value,
  } : undefined;
}
