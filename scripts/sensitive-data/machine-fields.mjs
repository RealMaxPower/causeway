import { isPgpSignature, isSshSignature } from './signature-packets.mjs';

const oidHeaders = new Map([
  ['@git/commit/header/tree', 'tree'], ['@git/commit/header/parent', 'parent'],
  ['@git/tag/header/object', 'object'],
]);
const clockHeaders = new Map([
  ['@git/commit/header/author-time', 'author'], ['@git/commit/header/committer-time', 'committer'],
  ['@git/tag/header/tagger-time', 'tagger'],
]);
const signatureHeaders = new Map([
  ['@git/commit/header/gpgsig', 'gpgsig'], ['@git/commit/header/gpgsig-sha256', 'gpgsig-sha256'],
]);

function canonicalBase64(value) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.from(value, 'base64').toString('base64') === value;
}

function encodedSignature(content, header) {
  if (!content.endsWith('\n') || content.includes('\r')) return false;
  const lines = content.slice(0, -1).split('\n');
  const begin = new RegExp(`^${header} -----BEGIN (PGP|SSH) SIGNATURE-----$`).exec(lines[0]);
  if (!begin || lines.length < 3 || lines.slice(1).some((line) => !line.startsWith(' '))) return false;
  const body = lines.slice(1).map((line) => line.slice(1));
  while (body.at(-1) === '') body.pop(); // Git can retain an armored trailing blank line.
  if (body.pop() !== `-----END ${begin[1]} SIGNATURE-----`) return false;
  const nonempty = body.filter((line) => line !== '');
  let checksum;
  if (begin[1] === 'PGP' && /^=[A-Za-z0-9+/]{4}$/.test(nonempty.at(-1) ?? '')) {
    checksum = Buffer.from(nonempty.pop().slice(1), 'base64');
  }
  if (!nonempty.length || !nonempty.every((line) => /^[A-Za-z0-9+/]+={0,2}$/.test(line)) ||
      !canonicalBase64(nonempty.join(''))) return false;
  const decoded = Buffer.from(nonempty.join(''), 'base64');
  if (checksum) {
    let crc = 0xb704ce;
    for (const byte of decoded) {
      crc ^= byte << 16;
      for (let bit = 0; bit < 8; bit++) { crc <<= 1; if (crc & 0x1000000) crc ^= 0x1864cfb; }
    }
    if ((crc & 0xffffff) !== checksum.readUIntBE(0, 3)) return false;
  }
  return begin[1] === 'PGP' ? isPgpSignature(decoded) : isSshSignature(decoded);
}

/** Classify only complete fixed Git fields, never caller flags or free text. */
export function classifyGitMachineFields({ id, path, content }) {
  const none = { machineGitNer: false, machineGitPhone: false };
  if (typeof id !== 'string' || !id.startsWith('metadata:') || typeof content !== 'string') return none;
  // The collector reserves this path for an exact message/ordered-parent match.
  // Ordinary and pre-commit messages stay fully scanned, even with this syntax.
  const merge = path === '@git/commit/merge-summary'
    ? /^Merge ([a-f0-9]{40}|[a-f0-9]{64}) into ([a-f0-9]{40}|[a-f0-9]{64})\n(?![\s\S])/.exec(content) : null;
  if (merge && merge[1].length === merge[2].length) {
    return { machineGitNer: true, machineGitPhone: true };
  }
  const oid = oidHeaders.get(path);
  if (oid && new RegExp(`^${oid} (?:[a-f0-9]{40}|[a-f0-9]{64})\\n(?![\\s\\S])`).test(content)) {
    return { machineGitNer: true, machineGitPhone: true };
  }
  const clock = clockHeaders.get(path);
  if (clock) {
    const match = new RegExp(`^${clock} ([+-]?(?:0|[1-9][0-9]{0,18})) [+-](?:[01][0-9]|2[0-3])[0-5][0-9]\\n(?![\\s\\S])`).exec(content);
    if (match && BigInt(match[1]) >= -(2n ** 63n) && BigInt(match[1]) <= 2n ** 63n - 1n) {
      return { machineGitNer: true, machineGitPhone: true };
    }
  }
  const signature = signatureHeaders.get(path);
  return signature && encodedSignature(content, signature)
    ? { machineGitNer: true, machineGitPhone: false } : none;
}
