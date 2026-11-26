#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const marker = '# Causeway privacy gate v1';
const managed = ['pre-commit', 'commit-msg', 'pre-push'];
const hookNames = [...managed, 'applypatch-msg', 'pre-applypatch', 'post-applypatch',
  'prepare-commit-msg', 'post-commit', 'pre-rebase', 'post-checkout', 'post-merge',
  'pre-receive', 'update', 'proc-receive', 'post-receive', 'post-update',
  'reference-transaction', 'push-to-checkout', 'pre-auto-gc', 'post-rewrite',
  'sendemail-validate', 'fsmonitor-watchman', 'p4-changelist', 'p4-prepare-changelist',
  'p4-post-changelist', 'p4-pre-submit', 'post-index-change'];
function git(root, args, optional = false) {
  // Honor the explicit target checkout even when invoked from Git tooling.
  // Global/system config selectors remain available for isolated tests and
  // for detecting the user's existing hooks; repository redirects do not.
  const selectors = new Set(['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM', 'GIT_CONFIG_NOSYSTEM']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('GIT_') || selectors.has(key)));
  try { return execFileSync('git', ['-C', root, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { if (optional) return ''; throw new Error('Git configuration failed.'); }
}

export function installHooks(root) {
  const configured = git(root, ['config', '--get', 'core.hooksPath'], true);
  if (configured && resolve(root, configured) !== join(root, '.githooks')) {
    throw new Error('Existing custom hooks need explicit integration; nothing was replaced.');
  }
  if (!configured) {
    const hooks = resolve(root, git(root, ['rev-parse', '--git-path', 'hooks']));
    if (hookNames.some((name) => existsSync(join(hooks, name)))) {
      throw new Error('Existing hooks need explicit integration; nothing was replaced.');
    }
  }
  for (const name of managed) {
    const file = join(root, '.githooks', name);
    if (!readFileSync(file, 'utf8').includes(marker)) throw new Error('Unrecognized managed hook.');
    chmodSync(file, 0o755);
  }
  git(root, ['config', '--local', 'core.hooksPath', '.githooks']);
  if (git(root, ['config', '--get', 'core.hooksPath']) !== '.githooks') throw new Error('Hook installation verification failed.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = git(process.cwd(), ['rev-parse', '--show-toplevel']);
    installHooks(root);
    process.stdout.write('Local privacy hooks installed. User approval is still required before commits and publication.\n');
  } catch {
    process.stderr.write('Privacy hooks were not installed. Check for existing hooks and integrate explicitly; do not bypass them.\n');
    process.exitCode = 1;
  }
}
