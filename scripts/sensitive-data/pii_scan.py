#!/usr/bin/env python3
"""Offline PII candidates. JSON in, redacted JSON out; never log source text."""

import base64
from datetime import date, datetime
import hashlib
import importlib.metadata
import json
import logging
from pathlib import Path
import re
import sys
import warnings

logging.disable(logging.CRITICAL)
warnings.filterwarnings("ignore")


def offline(event, _args):
    if event in {"socket.connect", "socket.getaddrinfo", "socket.sendto"}:
        raise RuntimeError("Network access is forbidden while scanning")


sys.addaudithook(offline)
SCRIPTS = Path(__file__).resolve().parent


def verify():
    manifest = json.loads((SCRIPTS / "tools.json").read_text())
    minor = f"{sys.version_info.major}.{sys.version_info.minor}"
    if minor not in manifest["pythonMinors"]:
        raise RuntimeError("Unsupported Python")
    expected = {}
    for line in (SCRIPTS / "requirements.txt").read_text().splitlines():
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+)==([^\s]+)\s+--hash=sha256:", line)
        if not match:
            raise RuntimeError("Invalid dependency lock")
        expected[match[1]] = match[2]
    expected[manifest["model"]["name"]] = manifest["model"]["version"]
    for name, version in expected.items():
        if importlib.metadata.version(name) != version:
            raise RuntimeError("Scanner dependency mismatch")
    return manifest


def engine(manifest):
    import spacy
    from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerRegistry
    from presidio_analyzer.nlp_engine import SpacyNlpEngine, NerModelConfiguration
    from presidio_analyzer.predefined_recognizers import (
        CreditCardRecognizer, IbanRecognizer, IpRecognizer, PhoneRecognizer,
        UsBankRecognizer, UsItinRecognizer,
        UsPassportRecognizer, UsSsnRecognizer,
    )

    model = manifest["model"]["name"]
    # Load an installed package directly; never call spaCy's auto-downloader.
    nlp = spacy.load(model)
    nlp.max_length = manifest["limits"]["maxRecordBytes"] + 1
    nlp_engine = SpacyNlpEngine(
        models=[{"lang_code": "en", "model_name": model}],
        ner_model_configuration=NerModelConfiguration(
            model_to_presidio_entity_mapping={"PERSON": "PERSON", "GPE": "LOCATION", "LOC": "LOCATION", "FAC": "LOCATION"},
            labels_to_ignore=["ORG", "DATE", "TIME", "NORP", "MONEY", "PERCENT", "CARDINAL", "ORDINAL", "QUANTITY", "EVENT", "WORK_OF_ART", "LAW", "LANGUAGE", "PRODUCT"],
        ),
    )
    nlp_engine.nlp = {"en": nlp}
    recognizers = [cls() for cls in (
        CreditCardRecognizer, IbanRecognizer, IpRecognizer, PhoneRecognizer,
        UsBankRecognizer, UsItinRecognizer,
        UsPassportRecognizer, UsSsnRecognizer,
    )]
    # Broad candidates deliberately include example domains: exception policy
    # is outside detectors. This recognizer never fetches a public suffix list.
    recognizers.append(PatternRecognizer(supported_entity="EMAIL_ADDRESS", patterns=[
        Pattern("email-candidate", r"[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)*\.(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})(?![\w-]|\.[\w-])", 0.5)
    ]))
    # Even conventionally invalid example identifiers are reviewable candidates;
    # do not let a recognizer's test-data heuristic become a publication waiver.
    recognizers.append(PatternRecognizer(supported_entity="US_SSN", patterns=[
        Pattern("ssn-shape-candidate", r"\b\d{3}-\d{2}-\d{4}\b", 0.5)
    ]))
    # US license formats overlap arbitrary identifiers and economic quantities.
    # Require an explicit identity-field label, not the generic word "license"
    # (which occurs beside dependency versions in every package lockfile).
    recognizers.append(PatternRecognizer(supported_entity="US_DRIVER_LICENSE", patterns=[
        Pattern("labeled-driver-license", r"(?i)\b(?:driver(?:['’]?s)?[ _-]*licen[cs]e|driving[ _-]*licen[cs]e|dl[ _-]*(?:number|no|id))\b[ \t\"':=#.-]{0,12}[A-Z0-9*][A-Z0-9* -]{4,20}[A-Z0-9*]\b", 0.6)
    ]))
    recognizers.append(PatternRecognizer(supported_entity="STREET_ADDRESS", patterns=[
        Pattern("street-candidate", r"(?i)\b\d{1,6}\s+(?:[A-Z][\w.'-]*\s+){1,6}(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|way)\b", 0.5)
    ]))
    registry = RecognizerRegistry(recognizers=recognizers, supported_languages=["en"])
    registry.add_nlp_recognizer(nlp_engine)
    return AnalyzerEngine(registry=registry, nlp_engine=nlp_engine, supported_languages=["en"], log_decision_process=False)


def nonphone_spans(text):
    """Validated technical tokens, applied only to PHONE_NUMBER results.

    Never remove these bytes from NLP or Gitleaks input. Labels/boundaries avoid
    treating an ordinary dotted contact number as a dependency version or hash.
    """
    spans = []
    digest = r"(?i)(?<![\w])(?:sha(?P<bits>1|224|256|384|512)|(?P<md5>md5)|(?P<fp>fingerprint|pathSha256|reviewedBySha256))[\"']?\s*[:=]\s*[\"']?(?P<value>[0-9a-f]+)(?![0-9a-z])"
    for match in re.finditer(digest, text):
        expected = 64 if match["fp"] else 32 if match["md5"] else 40 if match["bits"] == "1" else int(match["bits"]) // 4
        if len(match["value"]) == expected:
            spans.append(match.span("value"))
    for match in re.finditer(r"(?<![\w-])sha(256|384|512)-([A-Za-z0-9+/]+={0,2})(?![A-Za-z0-9+/=])", text):
        try:
            decoded = base64.b64decode(match[2], validate=True)
            if len(decoded) == int(match[1]) // 8 and base64.b64encode(decoded).decode() == match[2]:
                spans.append(match.span())
        except ValueError:
            pass
    number = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
    scalar = re.compile(number + r"%?")
    angle = re.compile(number + r"(?:deg|grad|rad|turn)?")
    for match in re.finditer(r"\b(rgb|rgba|hsl|hsla|lab|lch|oklab|oklch)\(([^()\r\n]{1,120})\)", text):
        body = match[2].strip()
        if "," in body:
            parts = [part.strip() for part in body.split(",")]
            valid = match[1] in {"rgb", "rgba", "hsl", "hsla"} and len(parts) in {3, 4}
        else:
            sides = body.split("/")
            parts = sides[0].split() + (sides[1].split() if len(sides) == 2 else [])
            valid = len(sides) <= 2 and len(sides[0].split()) == 3 and (len(sides) == 1 or len(sides[1].split()) == 1)
        units = [scalar, scalar, scalar, scalar]
        if match[1] in {"hsl", "hsla"}:
            units[:3] = [angle, re.compile(number + "%"), re.compile(number + "%")]
        elif match[1] in {"lch", "oklch"}:
            units[2] = angle
        if valid and all(pattern.fullmatch(part) for pattern, part in zip(units, parts)):
            spans.append(match.span())
    integer = r"(?:0|[1-9]\d*)"
    version = rf"{integer}\.{integer}\.{integer}(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    for match in re.finditer(rf"(?<![\w.+-])(?P<prefix>v|[~^>=<]{{1,2}})?(?P<version>{version})(?![\w.+-])", text):
        prefix = text[max(0, match.start() - 80):match.start()]
        labeled = re.search(r"(?:\bversion[\"']?\s*[:=]\s*[\"']?|[A-Za-z0-9_/-]@)$", prefix)
        prerelease = match["version"].split("+", 1)[0].split("-", 1)
        valid = len(prerelease) == 1 or all(not part.isdigit() or part == "0" or not part.startswith("0") for part in prerelease[1].split("."))
        if valid and (match["prefix"] or labeled):
            spans.append(match.span())
    for match in re.finditer(r"(?<![\w-])\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?(?![\w:+.-])", text):
        try:
            (datetime.fromisoformat if "T" in match[0] else date.fromisoformat)(match[0])
            spans.append(match.span())
        except ValueError:
            pass
    return spans


def scan(records, manifest):
    if not isinstance(records, list) or len(records) > manifest["limits"]["maxRecords"]:
        raise RuntimeError("Invalid record count")
    total = 0
    identifiers = set()
    for record in records:
        if not isinstance(record, dict) or not isinstance(record.get("id"), str) or not isinstance(record.get("content"), str):
            raise RuntimeError("Invalid record")
        data = record["content"].encode("utf-8")
        total += len(data)
        if len(data) > manifest["limits"]["maxRecordBytes"] or total > manifest["limits"]["maxTotalBytes"]:
            raise RuntimeError("Input exceeds limits")
        if hashlib.sha256(data).hexdigest() != record.get("sha256") or record["id"] in identifiers:
            raise RuntimeError("Record identity mismatch")
        identifiers.add(record["id"])
    analyzer = engine(manifest)
    results = []
    seen = set()
    for record in records:
        text = record["content"]
        technical_spans = nonphone_spans(text)
        # Overlap maintains candidates spanning chunk boundaries. The parent
        # also scans original whole records with Gitleaks.
        for offset in range(0, len(text), 49000):
            chunk = text[offset:offset + 50000]
            for result in analyzer.analyze(text=chunk, language="en", score_threshold=0.35):
                start, end = offset + result.start, offset + result.end
                # The parent validates closed policy or fixed Git-field syntax;
                # arbitrary paths, caller flags and free text are not classified.
                # NLP still receives unchanged text; deterministic rules remain.
                if ((record.get("machinePolicy") is True or record.get("machineGitNer") is True) and
                        result.entity_type in {"PERSON", "LOCATION"} and
                        (result.recognition_metadata or {}).get("recognizer_name") == "SpacyRecognizer"):
                    continue
                if result.entity_type == "PHONE_NUMBER" and record.get("machineGitPhone") is True:
                    continue
                if result.entity_type == "PHONE_NUMBER" and any(left <= start and end <= right for left, right in technical_spans):
                    continue
                key = (record["id"], result.entity_type, start, end)
                if key in seen:
                    continue
                seen.add(key)
                identity = f"{record['sha256']}:presidio:{result.entity_type}:{start}:{end}"
                results.append({
                    "recordId": record["id"], "detector": "presidio",
                    "rule": result.entity_type, "line": text.count("\n", 0, start) + 1,
                    "fingerprint": hashlib.sha256(identity.encode()).hexdigest(),
                })
    return results


def main():
    manifest = verify()
    if sys.argv[1:] == ["--check"]:
        # Check model loadability as well as metadata before declaring ready.
        engine(manifest)
        print(json.dumps({"presidio": manifest["presidio"], "spacy": manifest["spacy"], "model": manifest["model"]["version"]}))
        return
    if sys.argv[1:]:
        raise RuntimeError("Unsupported arguments")
    limit = manifest["limits"]["maxTotalBytes"] * 3
    payload = sys.stdin.buffer.read(limit + 1)
    if len(payload) > limit:
        raise RuntimeError("Input exceeds limits")
    print(json.dumps(scan(json.loads(payload), manifest), ensure_ascii=True))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never emit exception text or a traceback: either can contain input.
        print('{"error":"pii_scanner_failed"}', file=sys.stderr)
        sys.exit(2)
