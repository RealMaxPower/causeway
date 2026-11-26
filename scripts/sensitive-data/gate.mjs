import { hash, isExcepted, isReviewedArtifact, validatePolicy } from './policy.mjs';
import { isKnownRule } from './rules.mjs';

export async function evaluateSnapshot(snapshot, policy, scan) {
  validatePolicy(policy);
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.unsupported) ||
      !/^[a-f0-9]{64}$/.test(snapshot.identity)) throw new Error('Invalid scan snapshot.');
  for (const item of snapshot.unsupported) {
    if (typeof item.path !== 'string' || typeof item.reason !== 'string' ||
        !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Invalid unsupported-file result.');
  }
  const records = new Map(snapshot.records.map((record) => [record.id, record]));
  if (records.size !== snapshot.records.length) throw new Error('Duplicate scan record identifier.');
  const findings = await scan(snapshot.records);
  if (!Array.isArray(findings)) throw new Error('Invalid detector result.');
  const unresolved = [];
  let excepted = 0;
  for (const finding of findings) {
    const record = records.get(finding.recordId);
    if (!record || !isKnownRule(finding.detector, finding.rule) ||
        !Number.isSafeInteger(finding.line) || finding.line < 1 ||
        !/^[a-f0-9]{64}$/.test(finding.fingerprint)) {
      throw new Error('Detector returned an invalid finding.');
    }
    if (isExcepted(finding, record, policy)) { excepted += 1; continue; }
    unresolved.push({
      detector: finding.detector, rule: finding.rule,
      location: 'file:' + hash(record.path).slice(0, 16),
      line: finding.line, fingerprint: finding.fingerprint,
    });
  }
  const unsupported = snapshot.unsupported.filter((item) => !isReviewedArtifact(item, policy)).map((item) => ({
    location: 'file:' + hash(item.path).slice(0, 16),
    reason: /^[a-z-]+$/.test(item.reason) ? item.reason : 'unsupported',
    sha256: item.sha256,
  }));
  return {
    passed: unresolved.length === 0 && unsupported.length === 0,
    identity: snapshot.identity, records: snapshot.records.length,
    findings: unresolved, unsupported, excepted,
    reviewedArtifacts: snapshot.unsupported.length - unsupported.length,
  };
}
