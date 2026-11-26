import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyInstallation } from "./installation.mjs";
import { parsePolicy, POLICY_PATH } from "./policy.mjs";
import { classifyGitMachineFields } from "./machine-fields.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = () => new Error("Sensitive-data detector failed; publication is blocked.");

// No inherited GITLEAKS_CONFIG, Python path, proxy, or credential variables.
const environment = { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", TOKENIZERS_PARALLELISM: "false" };

function execute(command, args, { cwd, input, timeout = 300000, maxOutput = 33554432 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: environment, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [], stderr = [];
    let size = 0, failed = false;
    const abort = () => { failed = true; child.kill("SIGKILL"); };
    const timer = setTimeout(abort, timeout);
    const collect = (chunks) => (chunk) => {
      size += chunk.length;
      if (size > maxOutput) abort();
      else chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.on("error", () => { clearTimeout(timer); reject(fail()); });
    child.stdin.on("error", () => { /* An early exit is handled by close. */ });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failed || code === null) reject(fail());
      else resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"), hasStderr: stderr.some((chunk) => chunk.length > 0) });
    });
    child.stdin.end(input);
  });
}

/** Verify pinned tools without inspecting repository content. */
export async function verifyTools(root) {
  try {
    const tools = await verifyInstallation(root);
    const version = await execute(tools.gitleaks, ["version"], { cwd: tools.tools, timeout: 15000 });
    if (version.code !== 0 || version.hasStderr || version.stdout.trim() !== tools.manifest.gitleaks.version) throw fail();
    const check = await execute(tools.python, ["-I", "-B", path.join(tools.scripts, "pii_scan.py"), "--check"], { cwd: tools.tools });
    const reported = JSON.parse(check.stdout);
    if (check.code !== 0 || check.hasStderr || reported.presidio !== tools.manifest.presidio || reported.spacy !== tools.manifest.spacy || reported.model !== tools.manifest.model.version) throw fail();
    return { gitleaks: tools.manifest.gitleaks.version, presidio: reported.presidio, spacy: reported.spacy, model: reported.model };
  } catch { throw fail(); }
}

function validateRecords(records, limits) {
  if (!Array.isArray(records) || records.length > limits.maxRecords) throw fail();
  const ids = new Set();
  let total = 0;
  for (const record of records) {
    if (!record || typeof record.id !== "string" || typeof record.path !== "string" || typeof record.content !== "string") throw fail();
    const length = Buffer.byteLength(record.content);
    total += length;
    if (length > limits.maxRecordBytes || total > limits.maxTotalBytes || ids.has(record.id) || hash(record.content) !== record.sha256) throw fail();
    // Nulls and lone UTF-16 surrogates cannot safely be normalized as text.
    if (record.content.includes("\0") || !record.content.isWellFormed()) throw fail();
    ids.add(record.id);
  }
}

function validateFinding(finding, records) {
  if (!finding || !records.has(finding.recordId) || !["gitleaks", "presidio"].includes(finding.detector)
    || typeof finding.rule !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(finding.rule)
    || !Number.isInteger(finding.line) || finding.line < 1 || !/^[a-f0-9]{64}$/.test(finding.fingerprint)) throw fail();
  // Copy only whitelisted fields, even if a subprocess changes its output.
  return { recordId: finding.recordId, detector: finding.detector, rule: finding.rule, line: finding.line, fingerprint: finding.fingerprint };
}

/** Raw redacted candidates only. Caller applies exact reviewed exceptions. */
export async function scanTextRecords(records, { root } = {}) {
  let temporary;
  try {
    const tools = await verifyInstallation(root);
    validateRecords(records, tools.manifest.limits);
    // Derive this classification ourselves; never forward caller-supplied flags.
    // The closed schema contains only known enums, digests, and review dates.
    const piiRecords = records.map(({ id, path: filePath, content, sha256 }) => {
      const filenameMetadata = id.startsWith("path:") && content === POLICY_PATH && sha256 === hash(POLICY_PATH);
      const machinePolicy = filePath === POLICY_PATH && !filenameMetadata;
      if (machinePolicy) parsePolicy(content);
      return { id, path: filePath, content, sha256, machinePolicy,
        ...classifyGitMachineFields({ id, path: filePath, content }) };
    });
    await verifyTools(root);
    if (!records.length) return [];
    temporary = await mkdtemp(path.join(tmpdir(), "causeway-sensitive-"));
    await chmod(temporary, 0o700);
    const source = path.join(temporary, "input"), ignores = path.join(temporary, "empty-ignores");
    await mkdir(source, { mode: 0o700 });
    await mkdir(ignores, { mode: 0o700 });
    const names = new Map();
    for (const record of records) {
      const name = `${randomUUID()}.txt`;
      names.set(name, record);
      await writeFile(path.join(source, name), record.content, { mode: 0o600, flag: "wx" });
    }
    const config = path.join(temporary, "scanner.toml");
    await writeFile(config, "[extend]\nuseDefault = true\n", { mode: 0o600 });
    const options = { cwd: temporary, timeout: tools.manifest.limits.timeoutMs, maxOutput: tools.manifest.limits.maxOutputBytes };
    const leak = await execute(tools.gitleaks, [
      "dir", source, "--config", config, "--gitleaks-ignore-path", ignores,
      "--ignore-gitleaks-allow", "--redact=100", "--no-banner", "--no-color",
      "--log-level", "error", "--report-format", "json", "--report-path", "-",
      "--max-decode-depth", "5", "--max-target-megabytes", "0", "--timeout", "290",
    ], options);
    if (![0, 1].includes(leak.code) || leak.hasStderr) throw fail();
    const parsed = JSON.parse(leak.stdout);
    if (!Array.isArray(parsed) || (leak.code === 1 && parsed.length === 0)) throw fail();
    const findings = parsed.map((item) => {
      const record = names.get(path.basename(item.File ?? ""));
      if (!record || !Number.isInteger(item.StartLine) || !Number.isInteger(item.StartColumn)
        || !Number.isInteger(item.EndLine) || !Number.isInteger(item.EndColumn)) throw fail();
      return {
        recordId: record.id, detector: "gitleaks", rule: item.RuleID, line: item.StartLine,
        fingerprint: hash(`${record.sha256}:gitleaks:${item.RuleID}:${item.StartLine}:${item.StartColumn}:${item.EndLine}:${item.EndColumn}`),
      };
    });
    const pii = await execute(tools.python, ["-I", "-B", path.join(tools.scripts, "pii_scan.py")], { ...options, input: JSON.stringify(piiRecords) });
    if (pii.code !== 0 || pii.hasStderr) throw fail();
    const piiFindings = JSON.parse(pii.stdout);
    if (!Array.isArray(piiFindings)) throw fail();
    const ids = new Set(records.map((record) => record.id));
    return [...findings, ...piiFindings].map((finding) => validateFinding(finding, ids));
  } catch { throw fail(); }
  finally {
    if (temporary) {
      try { await rm(temporary, { recursive: true, force: true }); }
      catch { throw fail(); }
    }
  }
}
