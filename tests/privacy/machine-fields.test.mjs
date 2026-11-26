import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { classifyGitMachineFields } from '../../scripts/sensitive-data/machine-fields.mjs';
import { isPgpSignature, isSshSignature } from '../../scripts/sensitive-data/signature-packets.mjs';
import { scanTextRecords } from '../../scripts/sensitive-data/detectors.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = JSON.parse(await readFile(new URL('./machine-field-fixtures.json', import.meta.url), 'utf8'));
const record = (id, path, content) => ({ id, path, content, sha256: createHash('sha256').update(content).digest('hex') });
const metadata = (field, content) => record('metadata:' + field, '@git/commit/header/' + field, content);
const none = { machineGitNer: false, machineGitPhone: false };
const both = { machineGitNer: true, machineGitPhone: true };
const ner = { machineGitNer: true, machineGitPhone: false };
const uint32 = (value) => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
const string = (value) => { const bytes = Buffer.from(value); return Buffer.concat([uint32(bytes.length), bytes]); };
const armor = (kind, bytes) => `gpgsig -----BEGIN ${kind} SIGNATURE-----\n ${bytes.toString('base64')}\n -----END ${kind} SIGNATURE-----\n`;

function sshSignature({ namespace = 'git', reserved = '', version = 1, algorithm = 'ssh-ed25519', extra = Buffer.alloc(0) } = {}) {
  // Generate an actual ephemeral signature; private key material never leaves memory.
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const key = Buffer.concat([string(algorithm), string(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32))]);
  const digest = createHash('sha512').update('synthetic fixture').digest();
  const signed = Buffer.concat([Buffer.from('SSHSIG'), string(namespace), string(reserved), string('sha512'), string(digest)]);
  const signature = Buffer.concat([string('ssh-ed25519'), string(sign(null, signed, privateKey))]);
  return Buffer.concat([Buffer.from('SSHSIG'), uint32(version), string(key), string(namespace), string(reserved), string('sha512'), string(signature), extra]);
}

test('fixed object IDs and clocks require exact metadata provenance, paths and complete syntax', () => {
  for (const size of [40, 64]) {
    for (const field of ['tree', 'parent']) assert.deepEqual(classifyGitMachineFields(metadata(field, `${field} ${'a'.repeat(size)}\n`)), both);
    assert.deepEqual(classifyGitMachineFields(record('metadata:tag', '@git/tag/header/object', `object ${'b'.repeat(size)}\n`)), both);
  }
  for (const [field, label] of [['author-time', 'author'], ['committer-time', 'committer']]) {
    for (const epoch of ['0', '-1', '+1', '-9223372036854775808', '9223372036854775807']) {
      assert.deepEqual(classifyGitMachineFields(metadata(field, `${label} ${epoch} -2359\n`)), both);
    }
  }
  assert.deepEqual(classifyGitMachineFields(record('metadata:tag', '@git/tag/header/tagger-time', 'tagger 1 +0000\n')), both);
  for (const content of [`parent ${'a'.repeat(39)}\n`, `parent ${'g'.repeat(40)}\n`, `parent ${'a'.repeat(40)}\n\n`, `parent ${'a'.repeat(40)}\r\n`, `parent ${'a'.repeat(40)} extra\n`]) {
    assert.deepEqual(classifyGitMachineFields(metadata('parent', content)), none);
  }
  for (const content of ['author 1 +2400\n', 'author 1 +0060\n', 'author 01 +0000\n', 'author 9223372036854775808 +0000\n', 'author 1 +0000\n\n', 'committer 1 +0000\n']) {
    assert.deepEqual(classifyGitMachineFields(metadata('author-time', content)), none);
  }
  for (const input of [record('path:fixture', '@git/commit/header/parent', fixtures.oid), record('blob:fixture', '@git/commit/header/parent', fixtures.oid), metadata('unknown', fixtures.oid)]) {
    assert.deepEqual(classifyGitMachineFields(input), none);
  }
});

test('signatures require complete armor plus fixed decoded packet structures', () => {
  assert.deepEqual(classifyGitMachineFields(metadata('gpgsig', fixtures.signature)), ner);
  assert.deepEqual(classifyGitMachineFields(metadata('gpgsig-sha256', fixtures.signature.replace(/^gpgsig /, 'gpgsig-sha256 '))), ner);
  const ssh = sshSignature();
  assert.equal(isSshSignature(ssh), true);
  assert.deepEqual(classifyGitMachineFields(metadata('gpgsig', armor('SSH', ssh))), ner);
  const wire = (key, signature) => Buffer.concat([Buffer.from('SSHSIG'), uint32(1), string(key), string('git'), string(''), string('sha256'), string(signature)]);
  const rsaKey = Buffer.concat([string('ssh-rsa'), string(Buffer.from([1, 0, 1])), string(Buffer.from([0, 128, 1]))]);
  assert.equal(isSshSignature(wire(rsaKey, Buffer.concat([string('rsa-sha2-256'), string(Buffer.from([1, 2]))]))), true);
  assert.equal(isSshSignature(wire(rsaKey, Buffer.concat([string('ssh-rsa'), string(Buffer.from([1, 2]))]))), false);
  const curveName = 'ecdsa-sha2-nistp256', point = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]);
  const curveKey = Buffer.concat([string(curveName), string('nistp256'), string(point)]);
  const curveSignature = Buffer.concat([string(curveName), string(Buffer.concat([string(Buffer.from([1])), string(Buffer.from([2]))]))]);
  assert.equal(isSshSignature(wire(curveKey, curveSignature)), true);
  const wrongCurve = Buffer.concat([string(curveName), string('nistp384'), string(point)]);
  assert.equal(isSshSignature(wire(wrongCurve, curveSignature)), false);
  for (const bytes of [Buffer.from('WashingtonAA'), sshSignature({ namespace: 'personal' }), sshSignature({ reserved: 'owner text' }), sshSignature({ version: 2 }), sshSignature({ algorithm: 'ssh-ed25519-cert-v01@openssh.com' }), sshSignature({ extra: Buffer.from([0]) }), ssh.subarray(0, -1)]) {
    assert.equal(isSshSignature(bytes), false);
    assert.deepEqual(classifyGitMachineFields(metadata('gpgsig', armor('SSH', bytes))), none);
  }
  const invalid = [fixtures.signature + '\n', fixtures.signature.replace(' SIGNATURE-----\n', ' SIGNATURE-----\r\n'),
    fixtures.signature.replace('\n ', '\n Comment: synthetic owner\n '), fixtures.signature.replace('END PGP', 'END SSH'),
    'gpgsig -----BEGIN SSH SIGNATURE-----\n Washington\n AA\n -----END SSH SIGNATURE-----\n',
    'gpgsig -----BEGIN SSH SIGNATURE-----\n John\n Smith\n AAA\n -----END SSH SIGNATURE-----\n'];
  for (const content of invalid) assert.deepEqual(classifyGitMachineFields(metadata('gpgsig', content)), none);
  const pgp = Buffer.from(fixtures.signature.split('\n').slice(1).map((line) => line.slice(1)).filter((line) => /^[A-Za-z0-9+/]/.test(line)).join(''), 'base64');
  assert.equal(isPgpSignature(pgp), true);
  assert.equal(isPgpSignature(Buffer.concat([pgp, Buffer.from([0])])), false);
  assert.equal(isPgpSignature(pgp.subarray(0, -1)), false);
  // Replace a fixed numeric subpacket type with signer-ID: no machine classification.
  const textual = Buffer.from(pgp);
  const packetStart = (pgp[1] < 192 ? 2 : pgp[1] === 255 ? 6 : 3);
  textual[packetStart + 7] = 28;
  assert.equal(isPgpSignature(textual), false);
});

test('real detectors calibrate only complete Git machine fields and retain freeform PII', { timeout: 180000 }, async () => {
  const known = [metadata('parent', `parent ${fixtures.oid}\n`), metadata(fixtures.clock.field + '-time', fixtures.clock.content), metadata('gpgsig', fixtures.signature)];
  const ordinary = known.map((item, index) => record(`ordinary:${index}`, `synthetic/${index}.txt`, item.content));
  const ssh = metadata('gpgsig', armor('SSH', sshSignature())); ssh.id = 'metadata:ssh';
  const person = ['Barack', 'Obama'].join(' '), email = ['learner', 'example.test'].join('@');
  const text = `Contact ${person} in London. Email: ${email}. Phone: +1 ${['202', '555', '0143'].join(' ')}`;
  const free = ['parent', 'author-time', 'gpgsig', 'author-name', 'unknown'].map((field) => ({ ...metadata(field, text), id: 'metadata:free:' + field, machineGitNer: true, machineGitPhone: true }));
  const fakeArmor = [' Washington\n AA', ' John\n Smith\n AAA'].map((body, index) => ({ ...metadata('gpgsig', `gpgsig -----BEGIN SSH SIGNATURE-----\n${body}\n -----END SSH SIGNATURE-----\n`), id: 'metadata:fake:' + index }));
  const filename = { ...record('path:fixture', '@git/commit/header/author-time', fixtures.clock.content), machineGitPhone: true };
  const secret = metadata('parent', `parent ghp_${randomBytes(24).toString('hex').slice(0, 36)}\n`); secret.id = 'metadata:secret';
  const findings = await scanTextRecords([...known, ...ordinary, ssh, ...free, ...fakeArmor, filename, secret], { root });
  for (const item of known) assert.ok(!findings.some((f) => f.recordId === item.id && ['PERSON', 'LOCATION'].includes(f.rule)));
  for (const item of known.slice(0, 2)) assert.ok(!findings.some((f) => f.recordId === item.id && f.rule === 'PHONE_NUMBER'));
  assert.ok(findings.some((f) => f.recordId === 'ordinary:0' && ['PERSON', 'LOCATION'].includes(f.rule)));
  assert.ok(findings.some((f) => f.recordId === 'ordinary:1' && f.rule === 'PHONE_NUMBER'));
  assert.ok(findings.some((f) => f.recordId === 'ordinary:2' && ['PERSON', 'LOCATION'].includes(f.rule)));
  assert.ok(!findings.some((f) => f.recordId === ssh.id && ['PERSON', 'LOCATION'].includes(f.rule)));
  const deterministic = (id) => findings.filter((f) => f.recordId === id && !['PERSON', 'LOCATION'].includes(f.rule)).map((f) => [f.detector, f.rule, f.fingerprint]).sort();
  assert.deepEqual(deterministic(known[2].id), deterministic('ordinary:2'));
  for (const item of free) for (const rule of ['PERSON', 'LOCATION', 'EMAIL_ADDRESS', 'PHONE_NUMBER']) {
    assert.ok(findings.some((f) => f.recordId === item.id && f.rule === rule), `Freeform ${rule} remains detected`);
  }
  assert.ok(findings.some((f) => f.recordId === fakeArmor[0].id && f.rule === 'LOCATION'));
  assert.ok(findings.some((f) => f.recordId === fakeArmor[1].id && f.rule === 'PERSON'));
  assert.ok(findings.some((f) => f.recordId === filename.id && f.rule === 'PHONE_NUMBER'));
  assert.ok(findings.some((f) => f.recordId === secret.id && f.detector === 'gitleaks'));
});
