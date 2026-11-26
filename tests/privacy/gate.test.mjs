import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluateSnapshot } from '../../scripts/sensitive-data/gate.mjs';
import { parsePolicy, hash, requireStagedControls, controlIdentity } from '../../scripts/sensitive-data/policy.mjs';

const empty = () => ({ version: 2, exceptions: [], artifacts: [] });
const cleanGitEnv = (source = process.env) => ({
  ...Object.fromEntries(Object.entries(source).filter(([key]) => !key.startsWith('GIT_'))),
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
});
const hooks = ['pre-commit', 'commit-msg', 'pre-push'];
const record = (content = 'synthetic private candidate', path = 'sample.txt') => ({
  id: hash(path + content), path, content, sha256: hash(content),
});
const snapshot = (records, unsupported = []) => ({ records, unsupported, identity: hash(JSON.stringify(records)) });
const finding = (item) => ({ recordId: item.id, detector: 'presidio', rule: 'EMAIL_ADDRESS', line: 1, fingerprint: hash(item.sha256 + ':entity:1') });

test('unresolved PII blocks and output never includes text or sensitive filenames', async () => {
  const privateText = 'private-' + 'person' + '@' + 'example.test';
  const input = record(privateText, privateText + '.txt');
  const result = await evaluateSnapshot(snapshot([input]), empty(), async () => [finding(input)]);
  assert.equal(result.passed, false);
  assert.equal(JSON.stringify(result).includes(privateText), false);
  assert.equal(result.findings[0].line, 1);
});

test('exceptions bind detector, rule, exact path hash, full content and fingerprint', async () => {
  const input = record();
  const candidate = finding(input);
  const policy = empty();
  policy.exceptions.push({ detector: candidate.detector, rule: candidate.rule, pathSha256: hash(input.path),
    sha256: input.sha256, fingerprint: candidate.fingerprint, disposition: 'synthetic-fixture' });
  const parsed = parsePolicy(JSON.stringify(policy));
  assert.equal((await evaluateSnapshot(snapshot([input]), parsed, async () => [candidate])).passed, true);
  for (const changed of [record('another candidate'), record(input.content, 'other.txt')]) {
    assert.equal((await evaluateSnapshot(snapshot([changed]), parsed, async () => [finding(changed)])).passed, false);
  }
  for (const delta of [{ detector: 'gitleaks', rule: 'github-pat' }, { rule: 'PHONE_NUMBER' }, { fingerprint: hash('different') }]) {
    assert.equal((await evaluateSnapshot(snapshot([input]), parsed, async () => [{ ...candidate, ...delta }])).passed, false);
  }
});

test('scanner failure and malformed results cannot become a clean result', async () => {
  const input = record();
  await assert.rejects(evaluateSnapshot(snapshot([input]), empty(), async () => { throw new Error('offline'); }));
  await assert.rejects(evaluateSnapshot(snapshot([input]), empty(), async () => null));
  await assert.rejects(evaluateSnapshot(snapshot([input]), empty(), async () => [{ ...finding(input), recordId: 'missing' }]));
  await assert.rejects(evaluateSnapshot(snapshot([input]), empty(), async () => [{ ...finding(input), rule: 'unsafe\noutput' }]));
  await assert.rejects(evaluateSnapshot(snapshot([input]), empty(), async () => [{ ...finding(input), rule: 'UNKNOWN_RULE' }]));
});

test('only exact reviewed binaries can be cleared manually', async () => {
  const artifact = { path: 'picture.png', reason: 'binary', sha256: hash('reviewed image') };
  const policy = empty();
  assert.equal((await evaluateSnapshot(snapshot([], [artifact]), policy, async () => [])).passed, false);
  policy.artifacts.push({ pathSha256: hash(artifact.path), sha256: artifact.sha256,
    disposition: 'visual-and-metadata-review', reviewedBySha256: hash('fixture reviewer'), reviewedAt: '2026-11-26' });
  assert.equal((await evaluateSnapshot(snapshot([], [artifact]), parsePolicy(JSON.stringify(policy)), async () => [])).passed, true);
  for (const delta of [{ sha256: hash('new image') }, { path: 'other.png' }, { reason: 'symlink' }, { reason: 'lfs-pointer' }, { reason: 'oversized' }]) {
    assert.equal((await evaluateSnapshot(snapshot([], [{ ...artifact, ...delta }]), policy, async () => [])).passed, false);
  }
});

test('policy rejects legacy schemas, raw text, unknown rules and uncontrolled dispositions', () => {
  for (const raw of ['{}', '{', JSON.stringify({ ...empty(), exclude: ['tests'] }), JSON.stringify({ ...empty(), version: 1 })]) {
    assert.throws(() => parsePolicy(raw));
  }
  assert.throws(() => parsePolicy('{"version":"private fixture","version":2,"exceptions":[],"artifacts":[]}'));
  assert.throws(() => parsePolicy('{"version":2,"exceptions":[],"artifacts":[],"\\u0076ersion":2}'));
  assert.doesNotThrow(() => parsePolicy(JSON.stringify(empty(), null, 2)));
  const policy = empty();
  policy.exceptions.push({ detector: 'presidio', rule: 'PERSON', path: '*', reason: 'Allow everything' });
  assert.throws(() => parsePolicy(JSON.stringify(policy)));
  const exact = { detector: 'presidio', rule: 'PERSON', pathSha256: hash('example.txt'),
    sha256: hash('example'), fingerprint: hash('candidate'), disposition: 'public-reference' };
  for (const delta of [{ pathSha256: '*' }, { path: 'example.txt' }, { reason: 'Uncontrolled narrative' },
    { disposition: 'allow-all' }, { rule: 'UNKNOWN_RULE' }, { detector: 'gitleaks' }, { sha256: [exact.sha256] }]) {
    assert.throws(() => parsePolicy(JSON.stringify({ ...empty(), exceptions: [{ ...exact, ...delta }] })));
  }
  assert.doesNotThrow(() => parsePolicy(JSON.stringify({ ...empty(), exceptions: [{ ...exact, detector: 'gitleaks', rule: 'github-pat' }] })));
  const artifact = { pathSha256: hash('example.png'), sha256: hash('image'), disposition: 'visual-and-metadata-review',
    reviewedBySha256: hash('fixture reviewer'), reviewedAt: '2026-11-26' };
  for (const delta of [{ reviewedBy: 'Private reviewer' }, { path: 'example.png' }, { disposition: 'public-reference' },
    { reviewedAt: '2026-02-30' }, { reviewedBySha256: 'invalid' }]) {
    assert.throws(() => parsePolicy(JSON.stringify({ ...empty(), artifacts: [{ ...artifact, ...delta }] })));
  }
});

test('the complete policy text remains detector input', async () => {
  const policy = empty(), input = record(JSON.stringify(policy), 'scripts/sensitive-data/policy.json');
  let scanned = false;
  const result = await evaluateSnapshot(snapshot([input]), policy, async (records) => {
    scanned = records[0].content === JSON.stringify(policy);
    return [finding(input)];
  });
  assert.equal(scanned, true);
  assert.equal(result.passed, false);
});

test('staged controls must match active controls and any mutation changes identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'cw-controls-'));
  const env = cleanGitEnv();
  const git = (args) => execFileSync('git', ['-C', root, ...args], { env, stdio: 'pipe' });
  try {
    git(['init', '--quiet']);
    mkdirSync(join(root, 'scripts/sensitive-data'), { recursive: true });
    mkdirSync(join(root, '.githooks'));
    const path = 'scripts/sensitive-data/policy.json';
    writeFileSync(join(root, path), JSON.stringify(empty()));
    const hookRecords = hooks.map((name) => {
      const location = `.githooks/${name}`, content = '#!/bin/sh\nexit 0\n';
      writeFileSync(join(root, location), content, { mode: 0o755 });
      return record(content, location);
    });
    git(['add', path, '.githooks']);
    const original = controlIdentity(root);
    const item = record(JSON.stringify(empty()), path);
    assert.doesNotThrow(() => requireStagedControls(root, snapshot([item, ...hookRecords])));
    writeFileSync(join(root, path), JSON.stringify({ ...empty(), artifacts: [] }, null, 2));
    assert.notEqual(controlIdentity(root), original);
    assert.throws(() => requireStagedControls(root, snapshot([item, ...hookRecords])));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('nonexecutable staged hooks block and mode changes invalidate receipts', () => {
  const root = mkdtempSync(join(tmpdir(), 'cw-hook-mode-'));
  const env = cleanGitEnv();
  const git = (args) => execFileSync('git', ['-C', root, ...args], { env, stdio: 'pipe' });
  try {
    git(['init', '--quiet']);
    mkdirSync(join(root, 'scripts/sensitive-data'), { recursive: true });
    mkdirSync(join(root, '.githooks'));
    const path = '.githooks/pre-commit', content = '#!/bin/sh\nexit 0\n';
    for (const name of hooks) writeFileSync(join(root, '.githooks', name), content, { mode: name === 'pre-commit' ? 0o644 : 0o755 });
    git(['add', '.githooks']);
    const input = snapshot(hooks.map((name) => record(content, `.githooks/${name}`))), before = controlIdentity(root);
    assert.throws(() => requireStagedControls(root, input));
    chmodSync(join(root, path), 0o755);
    assert.notEqual(controlIdentity(root), before);
    assert.throws(() => requireStagedControls(root, input));
    git(['add', path]);
    assert.doesNotThrow(() => requireStagedControls(root, input));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a missing managed hook blocks even when every remaining control is staged', () => {
  const root = mkdtempSync(join(tmpdir(), 'cw-hook-missing-'));
  const git = (args) => execFileSync('git', ['-C', root, ...args], { env: cleanGitEnv(), stdio: 'pipe' });
  try {
    git(['init', '--quiet']);
    mkdirSync(join(root, 'scripts/sensitive-data'), { recursive: true });
    mkdirSync(join(root, '.githooks'));
    const content = '#!/bin/sh\nexit 0\n';
    for (const name of hooks) writeFileSync(join(root, '.githooks', name), content, { mode: 0o755 });
    git(['add', '.githooks']);
    for (const missing of hooks) {
      rmSync(join(root, '.githooks', missing));
      git(['add', '.githooks']);
      const input = snapshot(hooks.filter((name) => name !== missing).map((name) => record(content, `.githooks/${name}`)));
      assert.throws(() => requireStagedControls(root, input), /All managed privacy hooks/);
      writeFileSync(join(root, '.githooks', missing), content, { mode: 0o755 });
      git(['add', '.githooks']);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('hook installer preserves existing hooks and installs idempotently', () => {
  const root = mkdtempSync(join(tmpdir(), 'cw-hooks-'));
  const unrelated = mkdtempSync(join(tmpdir(), 'cw-unrelated-'));
  const env = cleanGitEnv({ ...process.env, GIT_DIR: join(unrelated, '.git'), GIT_WORK_TREE: unrelated });
  const git = (args) => execFileSync('git', ['-C', root, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const install = () => execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { installHooks } from ${JSON.stringify(new URL('../../scripts/sensitive-data/install-hooks.mjs', import.meta.url).href)}; installHooks(process.argv[1]);`, root],
  { env, stdio: 'pipe' });
  try {
    execFileSync('git', ['-C', unrelated, 'init', '--quiet'], { env, stdio: 'pipe' });
    execFileSync('git', ['-C', unrelated, 'config', '--local', 'core.hooksPath', 'unrelated-canary'], { env, stdio: 'pipe' });
    git(['init', '--quiet']);
    mkdirSync(join(root, '.githooks'));
    for (const name of ['pre-commit', 'commit-msg', 'pre-push']) {
      writeFileSync(join(root, '.githooks', name), '#!/bin/sh\n# Causeway privacy gate v1\nexit 0\n');
    }
    writeFileSync(join(root, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 0\n');
    assert.throws(install);
    rmSync(join(root, '.git/hooks/pre-commit'));
    git(['config', '--local', 'core.hooksPath', 'custom-hooks']);
    assert.throws(install);
    git(['config', '--local', '--unset', 'core.hooksPath']);
    install();
    install();
    assert.equal(git(['config', '--local', '--get', 'core.hooksPath']), '.githooks');
    assert.equal(execFileSync('git', ['-C', unrelated, 'config', '--local', '--get', 'core.hooksPath'], { env, encoding: 'utf8' }).trim(), 'unrelated-canary');
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(unrelated, { recursive: true, force: true }); }
});
