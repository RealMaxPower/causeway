#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectIndex, collectHistory, collectPush, collectWorktree, collectMessage, isBinaryPayload } from './git.mjs';
import { scanTextRecords, verifyTools } from './detectors.mjs';
import { loadPolicy, controlIdentity, requireStagedControls, hash } from './policy.mjs';
import { evaluateSnapshot } from './gate.mjs';

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000,
      env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0' },
    }).trim();
  } catch { throw new Error('Required Git operation failed.'); }
}

function receiptPath(root) {
  return resolve(root, git(root, ['rev-parse', '--git-path', 'causeway-privacy/pre-commit.json']));
}

function saveReceipt(root, value) {
  const path = receiptPath(root);
  mkdirSync(resolve(path, '..'), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
}

function readReceipt(root) {
  try { return JSON.parse(readFileSync(receiptPath(root), 'utf8')); } catch { return null; }
}

function artifacts(root, paths) {
  if (paths.length === 0) throw new Error('Specify at least one publication artifact.');
  const records = [], unsupported = [];
  for (const input of paths) {
    const absolute = resolve(root, input);
    const path = relative(root, absolute).split('\\').join('/');
    const stat = lstatSync(absolute);
    const filename = { id: hash('name:' + path), path: '@artifact-name/' + hash(path), content: path, sha256: hash(path) };
    records.push(filename);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      unsupported.push({ path, reason: 'unsupported-file', sha256: hash(path) }); continue;
    }
    if (stat.size > 2 * 1024 * 1024) {
      unsupported.push({ path, reason: 'oversized', sha256: hash(path) }); continue;
    }
    const buffer = readFileSync(absolute), sha256 = hash(buffer);
    if (isBinaryPayload(path, buffer)) {
      unsupported.push({ path, reason: 'binary', sha256 }); continue;
    }
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer); }
    catch { unsupported.push({ path, reason: 'binary', sha256 }); continue; }
    if (content.includes('\0')) { unsupported.push({ path, reason: 'binary', sha256 }); continue; }
    if (content.startsWith('version https://git-lfs.github.com/spec/v1')) {
      unsupported.push({ path, reason: 'lfs-pointer', sha256 }); continue;
    }
    records.push({ id: hash(path + ':' + sha256), path, content, sha256 });
  }
  return { records, unsupported, identity: hash(JSON.stringify({ records, unsupported })) };
}

function output(result, controls) {
  // Hashes identify locations without leaking sensitive filenames or matches.
  process.stdout.write(JSON.stringify({ ...result, controls }, null, 2) + '\n');
  if (!result.passed) process.exitCode = 1;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  // Hooks must execute this repository's controls, not another checkout's CLI.
  if (realpathSync(resolve(fileURLToPath(import.meta.url), '../../..')) !== realpathSync(root)) {
    throw new Error('Run the privacy CLI belonging to the current repository.');
  }
  await verifyTools(root);
  if (command === 'verify-tools') {
    if (args.length) throw new Error('Unexpected arguments.');
    process.stdout.write('Pinned local privacy tools verified.\n'); return;
  }
  const controls = controlIdentity(root), policy = loadPolicy(root);
  const scan = (snapshot) => evaluateSnapshot(snapshot, policy,
    (records) => scanTextRecords(records, { root, policy }));
  let snapshot;
  if (command === 'worktree') {
    if (args.length) throw new Error('Unexpected arguments.');
    snapshot = await collectWorktree(root);
  } else if (command === 'staged' || command === 'pre-commit') {
    if (args.length) throw new Error('Unexpected arguments.');
    snapshot = await collectIndex(root);
    requireStagedControls(root, snapshot);
  } else if (command === 'history') {
    if (args.length && (args.length !== 2 || args[0] !== '--range')) throw new Error('Expected --range REVISION.');
    snapshot = await collectHistory(root, { revisions: args.length ? [args[1]] : undefined });
  } else if (command === 'pre-push') {
    // Git supplies remote name/URL as hook args. Never print or interpret these
    // as the scan range; immutable per-ref updates come from hook stdin.
    if (args.length > 2) throw new Error('Unexpected hook arguments.');
    snapshot = await collectPush(root, readFileSync(0, 'utf8'));
  } else if (command === 'artifact') {
    snapshot = artifacts(root, args);
  } else if (command === 'commit-msg') {
    if (args.length !== 1) throw new Error('Expected the final commit message path.');
    snapshot = await collectIndex(root);
    requireStagedControls(root, snapshot);
    const receipt = readReceipt(root);
    if (!receipt || receipt.identity !== snapshot.identity || receipt.controls !== controls) {
      const result = await scan(snapshot);
      if (!result.passed) { output(result, controls); return; }
    }
    const message = await collectMessage(root, args[0]);
    const result = await scan(message);
    const finalSnapshot = await collectIndex(root);
    const finalMessage = await collectMessage(root, args[0]);
    if (finalSnapshot.identity !== snapshot.identity || finalMessage.identity !== message.identity ||
        controlIdentity(root) !== controls) throw new Error('Commit inputs changed during scanning; scan again.');
    output(result, controls); return;
  } else {
    throw new Error('Unknown privacy command. Use worktree, staged, history, artifact, or verify-tools.');
  }
  const result = await scan(snapshot);
  if (controlIdentity(root) !== controls) throw new Error('Privacy controls changed during scanning; scan again.');
  if (command === 'pre-commit' || command === 'staged') {
    if ((await collectIndex(root)).identity !== snapshot.identity) throw new Error('Index changed during scanning; scan again.');
    if (result.passed && command === 'pre-commit') saveReceipt(root, { identity: snapshot.identity, controls });
  }
  if (command === 'worktree' && (await collectWorktree(root)).identity !== snapshot.identity) {
    throw new Error('Worktree changed during scanning; scan again.');
  }
  if (command === 'artifact' && artifacts(root, args).identity !== snapshot.identity) {
    throw new Error('Publication artifacts changed during scanning; scan again.');
  }
  output(result, controls);
}

// Never echo raw child-process errors, paths, environment values, or findings.
main().catch(() => {
  process.stderr.write('Privacy scan could not complete safely. Publication blocked. Verify tools, inputs, and policy.\n');
  process.exitCode = 2;
});
