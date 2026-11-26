import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isKnownRule } from './rules.mjs';

export const POLICY_PATH = 'scripts/sensitive-data/policy.json';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
const digest = /^[a-f0-9]{64}$/;
const dispositions = new Set(['public-reference', 'technical-syntax', 'synthetic-fixture']);
const isDigest = (value) => typeof value === 'string' && digest.test(value);

function fields(value, required) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some((key) => !required.includes(key)) ||
      required.some((key) => !Object.hasOwn(value, key))) {
    throw new Error('Invalid sensitive-data policy structure.');
  }
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function parsePolicy(raw) {
  let policy;
  try { policy = JSON.parse(raw); } catch { throw new Error('Invalid sensitive-data policy JSON.'); }
  // Parsing alone loses duplicate keys and their overwritten raw values. Keep
  // canonical JSON tokens (formatting whitespace is allowed) so validating the
  // decoded machine schema also validates every byte-bearing string in input.
  const tokens = raw.replace(/("(?:[^"\\]|\\.)*")|\s+/g, (_match, quoted) => quoted ?? '');
  if (tokens !== JSON.stringify(policy)) throw new Error('Noncanonical sensitive-data policy JSON.');
  return validatePolicy(policy);
}

export function validatePolicy(policy) {
  fields(policy, ['version', 'exceptions', 'artifacts']);
  if (policy.version !== 2 || !Array.isArray(policy.exceptions) || !Array.isArray(policy.artifacts)) {
    throw new Error('Unsupported sensitive-data policy.');
  }
  for (const item of policy.exceptions) {
    fields(item, ['detector', 'rule', 'pathSha256', 'sha256', 'fingerprint', 'disposition']);
    if (!isKnownRule(item.detector, item.rule) || !dispositions.has(item.disposition) ||
        !isDigest(item.pathSha256) || !isDigest(item.sha256) || !isDigest(item.fingerprint)) {
      throw new Error('Invalid exact sensitive-data exception.');
    }
  }
  for (const item of policy.artifacts) {
    fields(item, ['pathSha256', 'sha256', 'disposition', 'reviewedBySha256', 'reviewedAt']);
    if (item.disposition !== 'visual-and-metadata-review' ||
        !isDigest(item.pathSha256) || !isDigest(item.sha256) ||
        !isDigest(item.reviewedBySha256) || !validDate(item.reviewedAt)) {
      throw new Error('Invalid exact artifact review.');
    }
  }
  return policy;
}

export function loadPolicy(root) {
  return parsePolicy(readFileSync(join(root, POLICY_PATH), 'utf8'));
}

export function controlFiles(root) {
  const files = [];
  for (const dir of ['scripts/sensitive-data', '.githooks']) {
    function visit(path) {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('Privacy controls cannot be symlinks.');
      if (stat.isDirectory()) {
        for (const name of readdirSync(path).sort()) {
          if (name === '__pycache__') continue;
          visit(join(path, name));
        }
      } else if (stat.isFile()) {
        files.push({ path: relative(root, path).split('\\').join('/'), sha256: hash(readFileSync(path)),
          mode: stat.mode & 0o111 ? '100755' : '100644' });
      } else {
        throw new Error('Unsupported privacy control file.');
      }
    }
    visit(join(root, dir));
  }
  return files;
}

export function controlIdentity(root) {
  return hash(JSON.stringify(controlFiles(root)));
}

export function requireStagedControls(root, snapshot) {
  const controls = controlFiles(root);
  for (const name of ['pre-commit', 'commit-msg', 'pre-push']) {
    if (!controls.some((file) => file.path === `.githooks/${name}` && file.mode === '100755')) {
      throw new Error('All managed privacy hooks must exist and be executable.');
    }
  }
  let staged;
  try {
    const entries = execFileSync('git', ['-C', root, 'ls-files', '--stage', '-z'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
    }).split('\0').filter(Boolean);
    staged = new Map(entries.map((entry) => {
      const tab = entry.indexOf('\t');
      const match = /^(100644|100755) [a-f0-9]+ 0$/.exec(entry.slice(0, tab));
      return [entry.slice(tab + 1), match?.[1]];
    }));
  } catch { throw new Error('Unable to verify staged privacy control modes.'); }
  for (const file of controls) {
    if (staged.get(file.path) !== file.mode ||
        (file.path.startsWith('.githooks/') && file.mode !== '100755') ||
        !snapshot.records.some((record) => record.path === file.path && record.sha256 === file.sha256)) {
      throw new Error('Stage the exact privacy controls being used before committing.');
    }
  }
}

export function isExcepted(finding, record, policy) {
  const pathSha256 = hash(record.path);
  return policy.exceptions.some((entry) =>
    entry.detector === finding.detector && entry.rule === finding.rule &&
    entry.pathSha256 === pathSha256 && entry.sha256 === record.sha256 &&
    entry.fingerprint === finding.fingerprint);
}

export function isReviewedArtifact(artifact, policy) {
  // A manual binary review cannot clear a symlink, gitlink, LFS pointer,
  // oversized input, or incomplete Git history.
  if (artifact.reason !== 'binary') return false;
  const pathSha256 = hash(artifact.path);
  return policy.artifacts.some((entry) =>
    entry.pathSha256 === pathSha256 && entry.sha256 === artifact.sha256);
}
