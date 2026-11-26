import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { scanTextRecords, verifyTools } from "../../scripts/sensitive-data/detectors.mjs";
import { verifyInstallation } from "../../scripts/sensitive-data/installation.mjs";
import { POLICY_PATH } from "../../scripts/sensitive-data/policy.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const record = (id, content) => ({ id, path: `synthetic/${id}.txt`, content, sha256: createHash("sha256").update(content).digest("hex") });

test("missing tools fail closed without returning filesystem details", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "scanner-missing-"));
  try {
    await assert.rejects(verifyTools(temporary), { message: "Sensitive-data detector failed; publication is blocked." });
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("real pinned detectors return redacted candidates and ignore ambient/inline exemptions", { timeout: 180000 }, async () => {
  const token = "ghp_" + randomBytes(24).toString("hex").slice(0, 36);
  const email = "learner" + "@" + "example.test";
  const inputs = [
    record("secret", `const token = "${token}"; // gitleaks:allow\n`),
    record("pii", [
      `Email: ${email}`, `An example person is ${["Barack", "Obama"].join(" ")}.`,
      "Phone: " + ["202", "555", "0143"].join("-"),
      "IP: " + [192, 0, 2, 1].join("."),
      "Card: " + ["4111", "1111", "1111", "1111"].join(" "),
      "SSN: " + ["123", "45", "6789"].join("-"),
      "Home address: " + ["123", "Example", "Street"].join(" "),
      "Driver license: " + "A" + "1234567",
    ].join("\n")),
    record("clean", "const sum = (left, right) => left + right;\nlicense: MIT\npackage" + "@" + "1.2.3\n"),
  ];
  const previous = process.env.GITLEAKS_CONFIG;
  process.env.GITLEAKS_CONFIG = "/not-an-allowed-scanner-config";
  try {
    const versions = await verifyTools(root);
    assert.equal(versions.gitleaks, "8.30.1");
    const findings = await scanTextRecords(inputs, { root, policy: {} });
    assert.ok(findings.some((f) => f.recordId === "secret" && f.detector === "gitleaks"));
    for (const entity of ["EMAIL_ADDRESS", "PERSON", "PHONE_NUMBER", "IP_ADDRESS", "CREDIT_CARD", "US_SSN", "STREET_ADDRESS", "US_DRIVER_LICENSE"]) {
      assert.ok(findings.some((f) => f.recordId === "pii" && f.rule === entity), `Expected ${entity} candidate`);
    }
    assert.ok(!findings.some((f) => f.recordId === "clean"));
    for (const finding of findings) {
      assert.deepEqual(Object.keys(finding).sort(), ["detector", "fingerprint", "line", "recordId", "rule"]);
      assert.match(finding.fingerprint, /^[a-f0-9]{64}$/);
    }
    assert.ok(!JSON.stringify(findings).includes(token));
    assert.ok(!JSON.stringify(findings).includes(email));
  } finally {
    if (previous === undefined) delete process.env.GITLEAKS_CONFIG;
    else process.env.GITLEAKS_CONFIG = previous;
  }
});

test("invalid text, mismatched hashes, and oversized records fail closed", async () => {
  for (const input of [
    { ...record("wrong-hash", "safe text"), sha256: "0".repeat(64) },
    record("null", "a\0b"),
    record("surrogate", "\ud800"),
    record("large", "x".repeat(2097153)),
  ]) {
    await assert.rejects(scanTextRecords([input], { root }), { message: "Sensitive-data detector failed; publication is blocked." });
  }
});

test("only independently validated machine policy receives narrow NLP classification", { timeout: 180000 }, async () => {
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  const policy = { version: 2, exceptions: [{ detector: "presidio", rule: "PERSON", pathSha256: sha("synthetic.txt"),
    sha256: sha("synthetic text"), fingerprint: sha("synthetic offset"), disposition: "synthetic-fixture" }],
  artifacts: [{ pathSha256: sha("synthetic.png"), sha256: sha("synthetic image"), disposition: "visual-and-metadata-review",
    reviewedBySha256: sha("synthetic reviewer"), reviewedAt: "2026-11-26" }] };
  const input = { ...record("machine-policy", JSON.stringify(policy)), path: POLICY_PATH, machinePolicy: false };
  const person = ["Barack", "Obama"].join(" "), email = ["learner", "example.test"].join("@");
  const ordinary = { ...record("ordinary", `Contact ${person} in London. Email: ${email}`), machinePolicy: true };
  const lookalike = { ...record("lookalike", ordinary.content), path: "unrelated/policy.json", machinePolicy: true };
  // Collectors emit the filename and its blob as distinct records at one path.
  const filename = { ...record("path:" + sha(POLICY_PATH), POLICY_PATH), path: POLICY_PATH, machinePolicy: true };
  const findings = await scanTextRecords([filename, input, ordinary, lookalike], { root });
  assert.ok(!findings.some((f) => f.recordId === input.id));
  for (const id of [ordinary.id, lookalike.id]) {
    for (const rule of ["PERSON", "LOCATION", "EMAIL_ADDRESS"]) {
      assert.ok(findings.some((f) => f.recordId === id && f.rule === rule), `Untrusted classification cannot hide ${rule}`);
    }
  }
  const invalid = [person, email, JSON.stringify({ ...policy, owner: person }), JSON.stringify({ ...policy, email }),
    JSON.stringify({ ...policy, exceptions: [{ ...policy.exceptions[0], disposition: person }] }),
    JSON.stringify({ ...policy, exceptions: [{ ...policy.exceptions[0], pathSha256: email }] }),
    JSON.stringify({ ...policy, exceptions: [{ ...policy.exceptions[0], rule: "UNKNOWN_RULE" }] }),
    JSON.stringify({ ...policy, version: 99 }),
    JSON.stringify(policy).replace('"version":2', `"version":${JSON.stringify(person)},"version":2`)];
  for (const content of invalid) {
    await assert.rejects(scanTextRecords([{ ...record("invalid-policy", content), path: POLICY_PATH, machinePolicy: true }], { root }),
      { message: "Sensitive-data detector failed; publication is blocked." });
  }
  await assert.rejects(scanTextRecords([{ ...record("path:" + sha("forgery"), person), path: POLICY_PATH }], { root }),
    { message: "Sensitive-data detector failed; publication is blocked." });
});

test("technical syntax suppresses only contained phone candidates and preserves contact formats", { timeout: 180000 }, async () => {
  const digits = ["202", "555", "0143"].join("");
  const digest = digits + "a".repeat(64 - digits.length);
  const sri = Buffer.from(digits + "a".repeat(75) + "A==", "base64").toString("base64");
  const technical = [
    `"sha256": "${digest}"`, `"fingerprint": "${digest}"`, `--hash=sha256:${digest}`,
    `"pathSha256": "${digest}"`, `"reviewedBySha256": "${digest}"`,
    `integrity: sha512-${sri}`, `oklch(0.${digits} 0.119 151.328)`,
    "version: 15.0.0", "package@15.0.0", "^15.0.0", "2026-11-26T12:34:56Z",
  ];
  const contacts = [
    `sha256: ${digest}; Phone: +1 ${["202", "555", "0143"].join(" ")}`,
    `"pathSha256": "${digest}"; Phone: +1 ${["202", "555", "0143"].join(" ")}`,
    `"reviewedBySha256": "${digest}"; Phone: +1 ${["202", "555", "0143"].join(" ")}`,
    "Phone: (" + "202" + ") " + ["555", "0143"].join("-"),
    "Phone: " + ["202", "555", "1433"].join("."),
  ];
  const records = [...technical.map((s, i) => record(`technical-${i}`, s)), ...contacts.map((s, i) => record(`contact-${i}`, s))];
  const findings = await scanTextRecords(records, { root });
  assert.ok(!findings.some((f) => f.recordId.startsWith("technical-") && f.rule === "PHONE_NUMBER"));
  for (let i = 0; i < contacts.length; i++) {
    assert.ok(findings.some((f) => f.recordId === `contact-${i}` && f.rule === "PHONE_NUMBER"), `Contact format ${i} remains detected`);
  }
  const script = [
    "import importlib.util,json,sys",
    "spec=importlib.util.spec_from_file_location('scanner',sys.argv[1])",
    "module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)",
    "print(json.dumps([bool(module.nonphone_spans(s)) for s in json.loads(sys.argv[2])]))",
  ].join("\n");
  const controls = [...technical, ...contacts.slice(3), "IP: " + [192, 0, 2, 1].join("."), "sha256: " + digits,
    "oklch(phone 0 0)", "rgb(1deg 2 3)", "2026-02-30", "version: 01.2.3", "version: 1.2.3-01"];
  const installation = await verifyInstallation(root);
  const { stdout } = await promisify(execFile)(installation.python,
    ["-I", "-B", "-c", script, path.join(root, "scripts/sensitive-data/pii_scan.py"), JSON.stringify(controls)], { timeout: 30000 });
  assert.deepEqual(JSON.parse(stdout), controls.map((_, i) => i < technical.length));
});

async function installedFixture(t) {
  const temporary = await mkdtemp(path.join(tmpdir(), "scanner-integrity-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const tools = path.join(temporary, ".sensitive-data-tools");
  const directory = path.join(tools, "install-synthetic");
  const scripts = path.join(temporary, "scripts/sensitive-data");
  await mkdir(scripts, { recursive: true });
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const manifest = JSON.stringify({ gitleaks: { version: "synthetic" }, presidio: "synthetic", spacy: "synthetic", model: { version: "synthetic" } });
  await writeFile(path.join(scripts, "tools.json"), manifest);
  await writeFile(path.join(scripts, "requirements.txt"), "synthetic==1\n");
  const entries = [];
  for (const name of ["python", "python/bin", "python/site-packages", "python/site-packages/model"]) {
    await mkdir(path.join(directory, name), { recursive: true });
    entries.push({ path: name, kind: "directory", mode: (await stat(path.join(directory, name))).mode & 0o777 });
  }
  const files = {
    gitleaks: "#!/bin/sh\nprintf 'synthetic\\n'\n",
    "python/bin/python": '#!/bin/sh\nprintf invoked > ../invoked\nprintf \'{"presidio":"synthetic","spacy":"synthetic","model":"synthetic"}\\n\'\n',
    "python/site-packages/recognizer.py": "def recognize(): return ['synthetic']\n",
    "python/site-packages/model/data": "synthetic model weights",
    "python/site-packages/METADATA": "Version: synthetic\n",
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(directory, name), content);
    if (["gitleaks", "python/bin/python"].includes(name)) await chmod(path.join(directory, name), 0o700);
    entries.push({ path: name, kind: "file", mode: (await stat(path.join(directory, name))).mode & 0o777, sha256: sha(content) });
  }
  const inventory = JSON.stringify(entries);
  await writeFile(path.join(directory, "inventory.json"), inventory);
  await writeFile(path.join(tools, "installation.json"), JSON.stringify({
    schemaVersion: 2, directory: "install-synthetic", inventorySha256: sha(inventory),
    manifestSha256: sha(manifest), requirementsSha256: sha("synthetic==1\n"), gitleaksSha256: sha(files.gitleaks),
  }));
  return { temporary, tools, directory };
}

for (const changed of ["recognizer.py", "model/data"]) {
  test(`changed installed ${changed} blocks before Python executes despite unchanged version metadata`, async (t) => {
    const fixture = await installedFixture(t);
    await verifyTools(fixture.temporary);
    assert.equal(await readFile(path.join(fixture.tools, "invoked"), "utf8"), "invoked");
    await rm(path.join(fixture.tools, "invoked"));
    await writeFile(path.join(fixture.directory, "python/site-packages", changed), "changed synthetic payload");
    await assert.rejects(verifyTools(fixture.temporary), { message: "Sensitive-data detector failed; publication is blocked." });
    await assert.rejects(readFile(path.join(fixture.tools, "invoked")), { code: "ENOENT" });
    assert.equal(await readFile(path.join(fixture.directory, "python/site-packages/METADATA"), "utf8"), "Version: synthetic\n");
  });
}

test("added import files and altered inventory cannot be accepted as the pinned installation", async (t) => {
  const fixture = await installedFixture(t);
  await verifyInstallation(fixture.temporary);
  const added = path.join(fixture.directory, "python/site-packages/injected.pth");
  await writeFile(added, "synthetic import path\n");
  await assert.rejects(verifyInstallation(fixture.temporary));
  await rm(added);
  await writeFile(path.join(fixture.directory, "inventory.json"), "[]");
  await assert.rejects(verifyInstallation(fixture.temporary));
});

test("bootstrap rebuilds a fresh generation and failed setup preserves the active installation", async (t) => {
  const temporary = await mkdtemp(path.join(tmpdir(), "scanner-rebuild-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const script = [
    "import importlib.util,json,pathlib,sys",
    "spec=importlib.util.spec_from_file_location('bootstrap',sys.argv[1])",
    "module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)",
    "root=pathlib.Path(sys.argv[2]).resolve();scripts=root/'scripts';scripts.mkdir()",
    "(scripts/'tools.json').write_text('{}');(scripts/'requirements.txt').write_text('synthetic==1')",
    "destination=root/'tools';destination.mkdir()",
    "class Builder:",
    " def __init__(self,**options): assert options['symlinks'] is False",
    " def create(self,directory):",
    "  (directory/'bin').mkdir(parents=True);(directory/'bin'/'python').write_text('synthetic interpreter')",
    "module.venv.EnvBuilder=Builder",
    "module.download=lambda *_: b'synthetic wheel'",
    "def install(args):",
    " if '--check' in args: return",
    " installed=pathlib.Path(args[0]).parents[1]/'recognizer.py'",
    " if '--require-hashes' in args:",
    "  assert not installed.exists();installed.write_text('pinned recognizer')",
    "module.run=install",
    "manifest={'model':{'url':'https://invalid.example/synthetic.whl','sha256':'unused'}}",
    "module.build_installation(destination,scripts,manifest,b'synthetic binary')",
    "state=lambda: json.loads((destination/'installation.json').read_text())",
    "first=state()['directory'];(destination/first/'python'/'recognizer.py').write_text('changed recognizer')",
    "module.build_installation(destination,scripts,manifest,b'synthetic binary')",
    "second=state()['directory'];saved=(destination/'installation.json').read_bytes()",
    "def failed(_): raise RuntimeError('synthetic install failure')",
    "module.run=failed",
    "try: module.build_installation(destination,scripts,manifest,b'synthetic binary')",
    "except RuntimeError: pass",
    "print(json.dumps({'distinct':first!=second,'recovered':(destination/second/'python'/'recognizer.py').read_text()=='pinned recognizer','preserved':saved==(destination/'installation.json').read_bytes(),'generations':len(list(destination.glob('install-*')))}))",
  ].join("\n");
  const { stdout } = await promisify(execFile)("python3", ["-I", "-B", "-c", script,
    path.join(root, "scripts/sensitive-data/bootstrap.py"), temporary], { timeout: 30000 });
  assert.deepEqual(JSON.parse(stdout), { distinct: true, recovered: true, preserved: true, generations: 2 });
});
