#!/usr/bin/env python3
"""Install pinned scanners locally. Only bootstrap accesses the network."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shutil
import ssl
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import venv


def download(url, expected):
    if not url.startswith("https://"):
        raise RuntimeError("HTTPS required")
    # Python.org macOS distributions can lack a populated default CA bundle.
    # Use the OS bundle when available; never disable TLS verification.
    context = ssl.create_default_context(
        cafile="/etc/ssl/cert.pem" if Path("/etc/ssl/cert.pem").exists() else None
    )
    with urllib.request.urlopen(url, timeout=60, context=context) as response:
        data = response.read(128 * 1024 * 1024 + 1)
    if len(data) > 128 * 1024 * 1024:
        raise RuntimeError("Download exceeds limit")
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError("Download checksum mismatch")
    return data


def run(args):
    result = subprocess.run(args, capture_output=True, timeout=600, check=False,
                            env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"})
    if result.returncode:
        # Never echo pip output: user configuration can contain private URLs.
        raise RuntimeError("Dependency installation failed; check network and Python support")


def inventory(directory):
    """Record every installed file, including bytecode and model data."""
    entries = []
    for parent, directories, filenames in os.walk(directory, followlinks=False):
        for name in sorted(directories + filenames):
            filename = Path(parent) / name
            entry = {"path": filename.relative_to(directory).as_posix(),
                     "mode": filename.lstat().st_mode & 0o777}
            if filename.is_symlink():
                if not filename.resolve().is_relative_to(directory):
                    raise RuntimeError("External installed symlink")
                entry.update(kind="symlink", target=os.readlink(filename))
            elif filename.is_dir():
                entry["kind"] = "directory"
            elif filename.is_file():
                with filename.open("rb") as source:
                    entry.update(kind="file", sha256=hashlib.file_digest(source, "sha256").hexdigest())
            else:
                raise RuntimeError("Unsupported installed file")
            entries.append(entry)
    return json.dumps(sorted(entries, key=lambda entry: entry["path"]), separators=(",", ":")).encode()


def build_installation(destination, scripts, manifest, binary):
    # A fresh generation avoids pip's trust in already-satisfied distributions.
    # Publish only its pointer, after every install, load check, and hash succeeds.
    directory = Path(tempfile.mkdtemp(prefix="install-", dir=destination))
    try:
        (directory / "gitleaks").write_bytes(binary)
        (directory / "gitleaks").chmod(0o700)
        python_dir = directory / "python"
        venv.EnvBuilder(with_pip=True, symlinks=False).create(python_dir)
        python = python_dir / "bin" / "python"
        pip = [str(python), "-I", "-B", "-m", "pip", "--isolated", "install",
               "--disable-pip-version-check", "--only-binary=:all:", "--no-compile"]
        if Path("/etc/ssl/cert.pem").exists():
            pip.extend(["--cert", "/etc/ssl/cert.pem"])
        run(pip + ["--index-url", "https://pypi.org/simple", "--require-hashes", "-r", str(scripts / "requirements.txt")])
        model = manifest["model"]
        with tempfile.TemporaryDirectory(dir=destination) as temporary:
            wheel = Path(temporary) / model["url"].rsplit("/", 1)[1]
            wheel.write_bytes(download(model["url"], model["sha256"]))
            run(pip + ["--no-deps", "--no-index", str(wheel)])
        run([str(python), "-I", "-B", str(scripts / "pii_scan.py"), "--check"])
        installed = inventory(directory)
        (directory / "inventory.json").write_bytes(installed)
        (directory / "inventory.json").chmod(0o600)
        state = {
            "schemaVersion": 2,
            "directory": directory.name,
            "inventorySha256": hashlib.sha256(installed).hexdigest(),
            "gitleaksSha256": hashlib.sha256(binary).hexdigest(),
            "manifestSha256": hashlib.sha256((scripts / "tools.json").read_bytes()).hexdigest(),
            "requirementsSha256": hashlib.sha256((scripts / "requirements.txt").read_bytes()).hexdigest(),
        }
        with tempfile.NamedTemporaryFile(dir=destination, mode="w", delete=False) as handle:
            handle.write(json.dumps(state) + "\n")
            state_path = Path(handle.name)
        state_path.chmod(0o600)
        state_path.replace(destination / "installation.json")
    except BaseException:
        shutil.rmtree(directory)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    root = args.root.resolve()
    scripts = root / "scripts" / "sensitive-data"
    manifest = json.loads((scripts / "tools.json").read_text())
    minor = f"{sys.version_info.major}.{sys.version_info.minor}"
    if minor not in manifest["pythonMinors"]:
        raise RuntimeError("Use a supported Python minor from tools.json")
    machine = {"aarch64": "arm64", "arm64": "arm64", "x86_64": "x64", "AMD64": "x64"}
    target = f"{platform.system().lower()}-{machine.get(platform.machine(), 'unsupported')}"
    archive = manifest["gitleaks"]["archives"].get(target)
    if not archive:
        raise RuntimeError("Unsupported platform")
    destination = root / ".sensitive-data-tools"
    if destination.is_symlink():
        raise RuntimeError("Tool directory must not be a symlink")
    destination.mkdir(mode=0o700, exist_ok=True)
    os.chmod(destination, 0o700)
    binary_archive = download(manifest["gitleaks"]["releaseBase"] + archive["name"], archive["sha256"])
    with tarfile.open(fileobj=io.BytesIO(binary_archive), mode="r:gz") as bundle:
        member = bundle.getmember("gitleaks")
        if not member.isfile() or member.size > 64 * 1024 * 1024:
            raise RuntimeError("Unexpected scanner archive")
        extracted = bundle.extractfile(member)
        if extracted is None:
            raise RuntimeError("Missing scanner binary")
        binary = extracted.read()
    build_installation(destination, scripts, manifest, binary)
    print("Pinned local scanners installed. No repository content was uploaded.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("Scanner bootstrap failed. Verify supported Python, network access, checksums, and local permissions.", file=sys.stderr)
        sys.exit(2)
