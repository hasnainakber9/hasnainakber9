#!/usr/bin/env python3
"""Find, install and run the command-line tools of the Crafting Apps.

Every Crafting App from ArtCraft (github.com/storytold) ships a headless `<app>-cli`
beside the desktop app: one command registry for batch runs, conversion, rendering
and an MCP server. This helper gets that binary onto the machine and runs it.

    craft.py apps                          what each app is for
    craft.py status [--json] [--online]    what is installed here, what this machine can do
    craft.py ensure APP [--from WHERE]     print the CLI's path, installing it first if needed
    craft.py run APP -- ARGS...            run the CLI (installs it first if needed)
    craft.py mcp APP [--root DIR]          print, or --register, the MCP server setup
    craft.py remove APP... | --all         delete binaries this helper installed
    craft.py clean [--src] [--target]      free disk: source checkouts, build cache

Installs go to $CRAFT_HOME (default ~/.craft-studio): bin/, src/, target/ and
installed.json. Stdlib only; Python 3.8+ on Linux, macOS, Windows and FreeBSD.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Dict, List, NamedTuple, NoReturn, Optional, Tuple

ORG = "storytold"
GITHUB_API = os.environ.get("CRAFT_GITHUB_API", "https://api.github.com").rstrip("/")
GITHUB_WEB = os.environ.get("CRAFT_GITHUB_WEB", "https://github.com").rstrip("/")
RELEASE_FEED = os.environ.get("CRAFT_RELEASE_FEED", "https://api.storyteller.ai/v1/craft_apps/release_info")
HOME = Path(os.environ.get("CRAFT_HOME") or Path.home() / ".craft-studio").expanduser()
BIN = HOME / "bin"
SRC = HOME / "src"
TARGET = HOME / "target"
STATE = HOME / "installed.json"
LOCKS = HOME / "locks"
USER_AGENT = "craft-studio-helper/1.0 (+https://github.com/hasnainakber9/hasnainakber9)"
TIMEOUT = 30
RUST_HINT = ("Install Rust with rustup (https://rustup.rs): "
             "curl --proto '=https' -sSf https://sh.rustup.rs | sh -s -- -y")


class App(NamedTuple):
    key: str
    title: str
    purpose: str
    formats: str
    roots: bool        # `mcp` accepts --automation-read-root/--automation-write-root to confine file access
    attach: str        # `mcp` flag that bridges to the desktop app started with `<app> --control PORT`
    attach_note: str = ""  # what the bridge needs besides the address
    repo: str = ""

    @property
    def cli(self) -> str:
        return f"{self.key}-cli"

    @property
    def repo_name(self) -> str:
        return self.repo or self.key


APPS: Dict[str, App] = {a.key: a for a in [
    App("photocraft", "PhotoCraft",
        "image editing: layers, masks, adjustment layers, retouching, filters, type, PSD",
        "PSD/PSB, layered TIFF, PNG, JPEG, WebP, GIF, BMP, TGA, EXR, HDR, FITS, SVG; reads XCF, KRA, ORA, PDN, Affinity",
        True, "--bridge", "the app's control token (PHOTOCRAFT_CONTROL_TOKEN or --control-token-file)"),
    App("lightcraft", "LightCraft",
        "photo library and raw development: cull, develop, mask, batch export, contact sheets, prints",
        "camera raw (DNG, CR2/CR3, NEF, ARW, RAF...), JPEG, TIFF, PNG; exports JPEG/PNG/TIFF/PSD/WebP/AVIF/JXL/DNG",
        False, "--connect"),
    App("vectorcraft", "VectorCraft",
        "vector illustration: logos, icons, illustrations, type on paths, tracing, print-ready art",
        "native .vectorcraft, SVG/SVGZ, PDF, AI, EPS, DXF, EMF/WMF, PNG/JPEG/WebP/TIFF/PSD; reads Affinity",
        True, "--connect"),
    App("figcraft", "FigCraft",
        "interface design and prototyping: screens, components, auto layout, design systems",
        "native .figcraft, .fig (best effort); exports PNG, SVG, PDF",
        True, "--attach"),
    App("designcraft", "DesignCraft",
        "page layout and publishing: brochures, magazines, posters, books, print PDF",
        "native .designcraft, IDML; exports PDF (incl. PDF/X) and PNG",
        True, "--connect"),
    App("effectcraft", "EffectCraft",
        "motion graphics and compositing: keyframes, shape and text layers, effects, Lottie",
        "native .ecproj; renders MP4, MOV (ProRes), WebM, GIF, PNG/EXR sequences; Lottie JSON",
        True, "--bridge"),
    App("filmcraft", "FilmCraft",
        "non-linear video editing: cut, trim, titles, color, audio mix, captions, export",
        "native .fcproj; MP4/MOV/MKV/MXF in; H.264 MP4, ProRes MOV, GIF, stills, WAV/AAC/FLAC, SRT/VTT out",
        False, "--bridge", "FILMCRAFT_CONTROL_TOKEN set to the same value for the app and the server"),
    App("soundcraft", "SoundCraft",
        "audio recording, editing, mixing and bouncing (a DAW)",
        "native .scraft; reads WAV, AIFF, FLAC, MP3, AAC/M4A, Ogg, ALAC, CAF; writes WAV, AIFF, FLAC; MIDI",
        True, "--connect"),
    App("cadcraft", "CADCraft",
        "2D CAD drafting: DWG/DXF drawings, floor plans, technical drawings, layouts, plots",
        "DWG, DXF, DWT; exports PDF, SVG, PNG",
        False, "--connect"),
    App("wordcraft", "WordCraft",
        "word processing: write, edit, review and convert documents",
        "DOCX, DOC (read), ODT, RTF, HTML, Markdown, TeX, TXT; exports PDF and PNG",
        True, "--connect", "the app's control key (WORDCRAFT_CONTROL_KEY or its key file)"),
    App("gridcraft", "GridCraft",
        "spreadsheets: formulas, formatting, charts, pivot tables",
        "XLSX/XLSM, CSV, TSV, JSON, HTML; reads XLS, XLSB, ODS; exports PDF",
        False, "--connect", "the app's control token (GRIDCRAFT_CONTROL_TOKEN or its token file)"),
    App("deckcraft", "DeckCraft",
        "presentations: build, edit, render and export slide decks",
        "PPTX/POTX/PPSX, native .deckcraft, Markdown/TXT/RTF outlines; exports PDF, PNG, JPEG, GIF",
        True, "--connect"),
    App("pdfcraft", "PdfCraft",
        "PDF reading and editing: inspect, text, render, combine, split, pages, forms, comments, redact, OCR",
        "PDF; renders PNG/JPEG/TIFF; exports text, DOCX/PPTX/HTML/RTF, form and comment data",
        True, ""),
]}

ALIASES = {
    "photoshop": "photocraft", "lightroom": "lightcraft", "illustrator": "vectorcraft",
    "figma": "figcraft", "indesign": "designcraft", "aftereffects": "effectcraft",
    "after-effects": "effectcraft", "premiere": "filmcraft", "protools": "soundcraft",
    "pro-tools": "soundcraft", "autocad": "cadcraft", "word": "wordcraft", "excel": "gridcraft",
    "powerpoint": "deckcraft", "acrobat": "pdfcraft",
}


# ---------------------------------------------------------------------------------------- utils

def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def die(msg: str, code: int = 1) -> NoReturn:
    log(f"craft: {msg}")
    sys.exit(code)


def exe(name: str) -> str:
    return name + ".exe" if os.name == "nt" else name


def app_for(name: str) -> App:
    key = name.lower().strip()
    key = ALIASES.get(key, key)
    if key.endswith("-cli"):
        key = key[:-4]
    if key not in APPS:
        die(f"unknown app '{name}'. Known: {', '.join(APPS)}")
    return APPS[key]


def host() -> Tuple[str, str]:
    system = platform.system().lower()
    os_name = {"darwin": "macos", "windows": "windows", "freebsd": "freebsd"}.get(system, "linux")
    machine = platform.machine().lower()
    arch = {"amd64": "x86_64", "x64": "x86_64", "arm64": "aarch64", "i386": "x86", "i686": "x86",
            "x86": "x86"}.get(machine, machine)
    return os_name, arch


def load_state() -> dict:
    try:
        return json.loads(STATE.read_text())
    except (OSError, ValueError):
        return {}


def save_state(state: dict) -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    os.replace(tmp, STATE)


def record(app: App, path: Path, method: str, version: str, sha256: str = "") -> None:
    state = load_state()
    state[app.key] = {"path": str(path), "method": method, "version": version, "sha256": sha256,
                      "installed": time.strftime("%Y-%m-%dT%H:%M:%S")}
    save_state(state)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cli_version(path: Path) -> str:
    try:
        out = subprocess.run([str(path), "--version"], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return ""
    text = (out.stdout or out.stderr).strip().splitlines()
    return text[0] if text else ""


class Lock:
    """One install per app at a time, across processes."""

    def __init__(self, name: str) -> None:
        self.path = LOCKS / f"{name}.lock"

    def __enter__(self) -> "Lock":
        LOCKS.mkdir(parents=True, exist_ok=True)
        waited = False
        while True:
            try:
                fd = os.open(str(self.path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                return self
            except FileExistsError:
                if self._stale():
                    self.path.unlink(missing_ok=True)
                    continue
                if not waited:
                    log(f"waiting for another install of {self.path.stem} to finish...")
                    waited = True
                time.sleep(5)

    def _stale(self) -> bool:
        """A lock left by an install that was killed (e.g. a shell timeout) or crashed."""
        try:
            age = time.time() - self.path.stat().st_mtime
            pid = int(self.path.read_text().strip() or 0)
        except (OSError, ValueError):
            return False  # being written or already gone; look again
        if age > 4 * 3600:  # builds never take this long
            return True
        if os.name == "nt" or pid <= 0:
            return False
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return True
        except PermissionError:
            return False
        return False

    def __exit__(self, *exc: object) -> None:
        self.path.unlink(missing_ok=True)


# ----------------------------------------------------------------------------------------- http

def _request(url: str, method: str = "GET", accept: str = "") -> urllib.request.Request:
    headers = {"User-Agent": USER_AGENT}
    if accept:
        headers["Accept"] = accept
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token and url.startswith("https://api.github.com/"):  # never send the token anywhere else
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.Request(url, method=method, headers=headers)


def http_json(url: str, accept: str = "application/vnd.github+json") -> dict:
    with urllib.request.urlopen(_request(url, accept=accept), timeout=TIMEOUT) as r:
        return json.load(r)


def http_text(url: str) -> str:
    with urllib.request.urlopen(_request(url), timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", "replace")


def http_final_url(url: str) -> str:
    with urllib.request.urlopen(_request(url, method="HEAD"), timeout=TIMEOUT) as r:
        return r.geturl()


def download(url: str, dest: Path) -> None:
    with urllib.request.urlopen(_request(url), timeout=TIMEOUT) as r, open(dest, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        done, last = 0, time.time()
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            done += len(chunk)
            if total and time.time() - last > 5:
                log(f"  {done * 100 // total}% of {total >> 20} MB")
                last = time.time()


# -------------------------------------------------------------------------------------- release

class InstallError(Exception):
    pass


def asset_names(app: App, version: str, os_name: str, arch: str) -> List[str]:
    if os_name == "linux":
        # pdfcraft also ships the CLI alone; every app's own tarball carries bin/<app>-cli.
        return [f"{app.cli}-{version}-linux-{arch}.tar.gz", f"{app.key}-{version}-linux-{arch}.tar.gz"]
    if os_name == "macos":
        return [f"{app.cli}-{version}-macos-universal.zip", f"{app.cli}-{version}-macos-{arch}.zip"]
    if os_name == "windows":
        warch = {"x86_64": "x64", "aarch64": "arm64"}.get(arch, arch)
        return [f"{app.key}-{version}-windows-{warch}-portable.zip"]
    if os_name == "freebsd":
        return [f"{app.key}-{version}-freebsd-{arch}.tar.gz"]
    return []


def resolve_release(app: App, version: Optional[str]) -> Tuple[str, Optional[dict]]:
    """Return (tag, {asset name: (url, sha256 or "")}); the dict is None when only the tag is known.

    Asks the GitHub API first, then the release feed the ArtCraft Launcher reads (it lists every
    file with its SHA-256 and spares the API's rate limit), then the releases page's redirect.
    """
    tag = f"v{version.lstrip('v')}" if version else None
    api = f"{GITHUB_API}/repos/{ORG}/{app.repo_name}/releases/" + (f"tags/{tag}" if tag else "latest")
    errors = []
    try:
        data = http_json(api)
        assets = {}
        for a in data.get("assets", []):
            digest = a.get("digest") or ""
            assets[a["name"]] = (a["browser_download_url"], digest[7:] if digest.startswith("sha256:") else "")
        return data["tag_name"], assets
    except (urllib.error.URLError, OSError, ValueError, KeyError) as e:
        errors.append(f"GitHub API: {e}")
    if tag:
        return tag, None
    try:
        release = http_json(RELEASE_FEED, accept="application/json")["release_info"]["apps"][app.key]["latest_release"]
        return release["tag"], {a["name"]: (a["download_url"], (a.get("sha256") or "").lower())
                                for a in release.get("assets", [])}
    except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as e:
        errors.append(f"release feed: {e!r}")
    try:
        final = http_final_url(f"{GITHUB_WEB}/{ORG}/{app.repo_name}/releases/latest")
    except (urllib.error.URLError, OSError) as e:
        errors.append(f"releases page: {e}")
        raise InstallError("no release information reachable from here (" + "; ".join(errors) + ")")
    m = re.search(r"/releases/tag/([^/?#]+)", final)
    if not m:
        raise InstallError(f"{app.title} has no published release yet")
    return m.group(1), None


def pick_member(names_sizes: List[Tuple[str, int]], member_name: str) -> Optional[str]:
    """The CLI inside an archive. Tarballs also carry a bash completion file with the same name
    (share/bash-completion/completions/<app>-cli), so prefer bin/, then the biggest match."""
    matches = [(n, s) for n, s in names_sizes if Path(n).name == member_name]
    if not matches:
        return None
    in_bin = [m for m in matches if Path(m[0]).parent.name == "bin"]
    return max(in_bin or matches, key=lambda m: m[1])[0]


def extract_cli(archive: Path, member_name: str, dest: Path) -> None:
    part = dest.with_name(dest.name + ".part")
    if archive.name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(archive, "r:gz") as tf:
            members = {m.name: m for m in tf.getmembers() if m.isfile()}
            name = pick_member([(n, m.size) for n, m in members.items()], member_name)
            if name is None:
                raise InstallError(f"{member_name} is not in {archive.name}")
            src = tf.extractfile(members[name])
            assert src is not None
            with src, open(part, "wb") as out:
                shutil.copyfileobj(src, out)
    else:
        with zipfile.ZipFile(archive) as zf:
            infos = {i.filename: i for i in zf.infolist() if not i.is_dir()}
            name = pick_member([(n, i.file_size) for n, i in infos.items()], member_name)
            if name is None:
                raise InstallError(f"{member_name} is not in {archive.name}")
            with zf.open(infos[name]) as src, open(part, "wb") as out:
                shutil.copyfileobj(src, out)
    with open(part, "rb") as f:
        head = f.read(4)
    if head[:2] == b"#!" or not (head.startswith(b"\x7fELF") or head[:2] == b"MZ"
                                 or head in (b"\xcf\xfa\xed\xfe", b"\xca\xfe\xba\xbe")):
        part.unlink()
        raise InstallError(f"{member_name} in {archive.name} is not an executable binary")
    part.chmod(0o755)
    os.replace(part, dest)


def install_release(app: App, version: Optional[str], verify: bool) -> Path:
    os_name, arch = host()
    tag, assets = resolve_release(app, version)
    ver = tag[1:] if tag.startswith("v") else tag
    base = f"{GITHUB_WEB}/{ORG}/{app.repo_name}/releases/download/{tag}/"
    candidates = [n for n in asset_names(app, ver, os_name, arch) if assets is None or n in assets]
    if not candidates:
        raise InstallError(f"{app.title} {tag} has no build for {os_name}-{arch}")
    sums: Optional[Dict[str, str]] = None
    BIN.mkdir(parents=True, exist_ok=True)
    dest = BIN / exe(app.cli)
    with tempfile.TemporaryDirectory(prefix="craft-") as tmp:
        for name in candidates:
            url, digest = assets[name] if assets else (base + name, "")
            archive = Path(tmp) / name
            log(f"downloading {name} ({app.title} {tag})")
            try:
                download(url, archive)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    continue
                raise InstallError(f"download failed: {e}")
            except (urllib.error.URLError, OSError) as e:
                raise InstallError(f"download failed: {e}")
            actual = sha256_of(archive)
            if verify:
                if not digest:
                    if sums is None:
                        sums = {}
                        try:
                            for line in http_text(base + "SHA256SUMS.txt").splitlines():
                                parts = line.split()
                                if len(parts) == 2:
                                    sums[parts[1].lstrip("*")] = parts[0].lower()
                        except (urllib.error.URLError, OSError):
                            pass
                    digest = sums.get(name, "")
                if not digest:
                    raise InstallError(f"no published SHA-256 for {name}; rerun with --no-verify to accept it unchecked")
                if digest.lower() != actual:
                    raise InstallError(f"SHA-256 mismatch for {name}: expected {digest}, got {actual}")
            extract_cli(archive, exe(app.cli), dest)
            record(app, dest, f"release {tag}", ver, actual)
            return dest
    raise InstallError(f"no {os_name}-{arch} download found for {app.title} {tag}")


# --------------------------------------------------------------------------------------- source

def need(tool: str, hint: str = "") -> str:
    path = shutil.which(tool)
    if not path:
        raise InstallError(f"{tool} is not installed. {hint}".strip())
    return path


def run(cmd: List[str], cwd: Optional[Path] = None, env: Optional[dict] = None) -> None:
    log("$ " + " ".join(shlex.quote(str(c)) for c in cmd))
    result = subprocess.run([str(c) for c in cmd], cwd=str(cwd) if cwd else None, env=env)
    if result.returncode != 0:
        raise InstallError(f"command failed with exit code {result.returncode}: {cmd[0]} {cmd[1]}")


def rust_version(rustc: str) -> Tuple[int, ...]:
    out = subprocess.run([rustc, "--version"], capture_output=True, text=True).stdout
    m = re.search(r"(\d+)\.(\d+)", out)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def required_rust(src: Path) -> Tuple[int, ...]:
    try:
        text = (src / "Cargo.toml").read_text()
    except OSError:
        return (0, 0)
    m = re.search(r'rust-version\s*=\s*"(\d+)\.(\d+)', text)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


class BuildError(InstallError):
    """The compiler, not the setup, failed: another source revision may build."""


def latest_tag(app: App, git: str, env: dict) -> Optional[str]:
    """The newest stable release tag (vX.Y.Z), read with git so it works wherever cloning does."""
    try:
        out = subprocess.run([git, "ls-remote", "--tags", "--refs", f"https://github.com/{ORG}/{app.repo_name}"],
                             capture_output=True, text=True, timeout=120, env=env).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    tags = []
    for line in out.splitlines():
        m = re.fullmatch(r"refs/tags/(v(\d+)\.(\d+)\.(\d+))", line.split("\t")[-1].strip())
        if m:
            tags.append((tuple(int(g) for g in m.groups()[1:]), m.group(1)))
    return max(tags)[1] if tags else None


def install_source(app: App, version: Optional[str], jobs: Optional[int], lto: bool, fonts: bool = True) -> Path:
    """Build the requested release, else the latest release tag, else the default branch."""
    git = need("git")
    cargo = need("cargo", RUST_HINT)
    env = dict(os.environ, GIT_LFS_SKIP_SMUDGE="1", GIT_TERMINAL_PROMPT="0")
    if version:
        refs: List[Optional[str]] = [f"v{version.lstrip('v')}"]
    else:
        tag = latest_tag(app, git, env)
        refs = [tag, None] if tag else [None]
    for i, ref in enumerate(refs):
        try:
            return build_ref(app, ref, git, cargo, env, jobs, lto, fonts)
        except BuildError as e:
            if i + 1 == len(refs):
                raise
            log(f"{app.cli} {ref} did not build ({e}); trying the default branch")
    raise AssertionError("unreachable")


def craft_fonts(src: Path, git: str, env: dict) -> Optional[Path]:
    """Check out the craft-fonts commit the app's releases embed, for CRAFT_FONTS_DIR.

    Release builds embed these faces (Japanese, Chinese, Korean, Arabic and Urdu, Hebrew, Thai,
    Devanagari, and some apps' theme fonts); without them a source build falls back to system fonts.
    """
    ref = None
    for workflow in sorted((src / ".github" / "workflows").glob("*.yml")):
        m = re.search(r"craft-fonts-ref:\s*([0-9a-f]{40})", workflow.read_text(errors="replace"))
        if m:
            ref = m.group(1)
            break
    if not ref:
        return None
    dest = SRC / f"craft-fonts-{ref[:12]}"
    with Lock(dest.name):
        if (dest / "fonts").is_dir():
            return dest
        part = dest.with_name(dest.name + ".part")
        try:
            if part.exists():
                shutil.rmtree(part)
            run([git, "init", "-q", part], env=env)
            run([git, "-C", part, "fetch", "-q", "--depth", "1", f"https://github.com/{ORG}/craft-fonts", ref], env=env)
            run([git, "-C", part, "checkout", "-q", "FETCH_HEAD"], env=env)
            os.replace(part, dest)
        except (InstallError, OSError) as e:
            log(f"craft-fonts is unavailable ({e}); building with system fonts only")
            return None
    return dest


def build_ref(app: App, ref: Optional[str], git: str, cargo: str, env: dict,
              jobs: Optional[int], lto: bool, fonts: bool) -> Path:
    SRC.mkdir(parents=True, exist_ok=True)
    src = SRC / app.repo_name
    if (src / ".git").is_dir():
        run([git, "-C", src, "fetch", "--depth", "1", "origin", f"refs/tags/{ref}" if ref else "HEAD"], env=env)
        run([git, "-C", src, "checkout", "--force", "--detach", "FETCH_HEAD"], env=env)
    else:
        if src.exists():
            shutil.rmtree(src)
        run([git, "clone", "--depth", "1", *(["--branch", ref] if ref else []),
             f"https://github.com/{ORG}/{app.repo_name}", src], env=env)
    rustc = shutil.which("rustc")
    if rustc and not (src / "rust-toolchain.toml").exists() and not (src / "rust-toolchain").exists():
        have, want = rust_version(rustc), required_rust(src)
        if have < want:
            raise InstallError(f"{app.title} needs Rust {'.'.join(map(str, want))}+, this machine has "
                               f"{'.'.join(map(str, have))}. Update with: rustup update stable")
    benv = dict(env, CARGO_NET_GIT_FETCH_WITH_CLI="true", CARGO_TARGET_DIR=str(TARGET),
                CARGO_INCREMENTAL="0", CARGO_PROFILE_RELEASE_DEBUG="0")
    if not lto:
        # The apps release with LTO; a local agent build does not need it and builds much faster.
        benv.update(CARGO_PROFILE_RELEASE_LTO="false", CARGO_PROFILE_RELEASE_CODEGEN_UNITS="16")
    font_dir = craft_fonts(src, git, env) if fonts and "CRAFT_FONTS_DIR" not in os.environ else None
    if font_dir:
        benv["CRAFT_FONTS_DIR"] = str(font_dir)
    cmd = [cargo, "build", "--release", "--locked", "-p", app.cli]
    if jobs:
        cmd += ["-j", str(jobs)]
    log(f"building {app.cli} {ref or '(default branch)'} from source; a first build takes roughly 5-25 minutes")
    try:
        run(cmd, cwd=src, env=benv)
    except InstallError as e:
        raise BuildError(str(e)) from e
    built = TARGET / "release" / exe(app.cli)
    if not built.is_file():
        raise InstallError(f"build finished but {built} is missing")
    BIN.mkdir(parents=True, exist_ok=True)
    dest = BIN / exe(app.cli)
    part = dest.with_name(dest.name + ".part")
    shutil.copy2(built, part)
    os.replace(part, dest)
    head = subprocess.run([git, "-C", str(src), "rev-parse", "--short", "HEAD"],
                          capture_output=True, text=True).stdout.strip()
    record(app, dest, f"source {ref or 'default branch'}@{head}", cli_version(dest), sha256_of(dest))
    return dest


# --------------------------------------------------------------------------------------- lookup

def known_locations(app: App) -> List[Path]:
    os_name, _ = host()
    name = exe(app.cli)
    if os_name == "windows":
        roots = [os.environ.get("ProgramFiles", r"C:\Program Files"), os.environ.get("ProgramFiles(x86)", ""),
                 os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs")]
        return [Path(r) / app.title / name for r in roots if r]
    if os_name == "macos":
        return [Path("/opt/homebrew/bin") / name, Path("/usr/local/bin") / name,
                Path(f"/Applications/{app.title}.app/Contents/MacOS") / name,
                Path.home() / f"Applications/{app.title}.app/Contents/MacOS" / name]
    return [Path("/usr/bin") / name, Path("/usr/local/bin") / name, Path.home() / ".local/bin" / name,
            Path(f"/opt/{app.key}/bin") / name]


def find_existing(app: App) -> Tuple[Optional[Path], str]:
    override = os.environ.get(f"{app.key.upper()}_CLI")
    if override and Path(override).is_file():
        return Path(override), f"${app.key.upper()}_CLI"
    cached = BIN / exe(app.cli)
    if cached.is_file():
        return cached, "craft-studio"
    on_path = shutil.which(app.cli)
    if on_path:
        return Path(on_path), "PATH"
    for p in known_locations(app):
        if p.is_file():
            return p, "app install"
    return None, ""


def ensure(app: App, source: str = "auto", version: Optional[str] = None, update: bool = False,
           verify: bool = True, jobs: Optional[int] = None, lto: bool = False) -> Path:
    if not update and not version:
        found, _ = find_existing(app)
        if found:
            return found
    with Lock(app.key):
        if not update and not version:
            found, _ = find_existing(app)  # another process may have installed it while we waited
            if found:
                return found
        errors = []
        if source in ("auto", "release"):
            try:
                return install_release(app, version, verify)
            except InstallError as e:
                errors.append(f"release: {e}")
                if source == "release":
                    raise InstallError("; ".join(errors))
                log(f"no release download ({e}); building from source instead")
        try:
            return install_source(app, version, jobs, lto)
        except InstallError as e:
            errors.append(f"source: {e}")
            raise InstallError("; ".join(errors))


# ------------------------------------------------------------------------------------- commands

def cmd_apps(args: argparse.Namespace) -> None:
    if args.json:
        print(json.dumps([dict(a._asdict(), cli=a.cli, repo=f"https://github.com/{ORG}/{a.repo_name}")
                          for a in APPS.values()], indent=2))
        return
    for a in APPS.values():
        print(f"{a.key:<12} {a.purpose}\n{'':<12} files: {a.formats}")


def reachable(url: str) -> bool:
    try:
        with urllib.request.urlopen(_request(url, method="HEAD"), timeout=8):
            return True
    except urllib.error.HTTPError as e:
        return e.code < 400
    except (urllib.error.URLError, OSError):
        return False


def cmd_status(args: argparse.Namespace) -> None:
    os_name, arch = host()
    state = load_state()
    apps = {}
    for a in APPS.values():
        path, how = find_existing(a)
        apps[a.key] = {"cli": a.cli, "path": str(path) if path else None, "found_by": how or None,
                       "version": cli_version(path) if path else None,
                       "installed_with": state.get(a.key, {}).get("method")}
    tools = {}
    for t in ("git", "cargo", "rustc", "claude", "ffmpeg"):
        p = shutil.which(t)
        tools[t] = p
    rustc = tools.get("rustc")
    try:
        free_gb = round(shutil.disk_usage(str(HOME if HOME.exists() else Path.home())).free / 2**30, 1)
    except OSError:
        free_gb = None
    info = {
        "platform": f"{os_name}-{arch}", "python": platform.python_version(), "craft_home": str(HOME),
        "disk_free_gb": free_gb, "tools": tools,
        "rust": ".".join(map(str, rust_version(rustc))) if rustc else None,
        "display": bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")) or os_name in ("macos", "windows"),
        "apps": apps,
    }
    if args.online:
        info["reachable"] = {
            "github_api": reachable(f"{GITHUB_API}/repos/{ORG}/photocraft/releases/latest"),
            "github_releases": reachable(f"{GITHUB_WEB}/{ORG}/photocraft/releases/latest"),
            "release_feed": reachable(RELEASE_FEED),
            "github_raw": reachable(f"https://raw.githubusercontent.com/{ORG}/photocraft/HEAD/README.md"),
        }
    if args.json:
        print(json.dumps(info, indent=2))
        return
    print(f"platform  {info['platform']}  python {info['python']}  home {HOME}  free {free_gb} GB")
    print("tools     " + "  ".join(f"{k}:{'yes' if v else 'no'}" for k, v in tools.items())
          + (f"  rust {info['rust']}" if info["rust"] else ""))
    print(f"display   {'yes' if info['display'] else 'no (headless: use the CLIs and MCP servers)'}")
    if "reachable" in info:
        print("network   " + "  ".join(f"{k}:{'ok' if v else 'blocked'}" for k, v in info["reachable"].items()))
    for key, a in apps.items():
        where = f"{a['path']}  [{a['found_by']}]  {a['version'] or ''}" if a["path"] else "not installed"
        print(f"{key:<12} {where}")
    if not any(a["path"] for a in apps.values()):
        print("\nNothing installed yet: `craft.py ensure <app>` downloads the release build, "
              "or builds it from source when downloads are blocked.")


def cmd_ensure(args: argparse.Namespace) -> None:
    app = app_for(args.app)
    try:
        path = ensure(app, args.source, args.version, args.update, not args.no_verify, args.jobs, args.lto)
    except InstallError as e:
        die(str(e))
    print(path)


def cmd_run(args: argparse.Namespace) -> None:
    app = app_for(args.app)
    rest = args.rest[1:] if args.rest[:1] == ["--"] else args.rest
    try:
        path = ensure(app)
    except InstallError as e:
        die(str(e))
    argv = [str(path)] + rest
    if os.name == "nt":
        sys.exit(subprocess.call(argv))
    sys.stdout.flush()
    os.execv(argv[0], argv)


def mcp_args(app: App, root: Optional[str], attach: Optional[str]) -> List[str]:
    if attach:
        if not app.attach:
            die(f"{app.title}'s MCP server cannot attach to the app. Drive the window with "
                f"`{app.key} --control ~/.{app.key}-control.json` and `{app.cli} ui --control FILE ...`.")
        port = attach.rsplit(":", 1)[-1]
        if not port.isdigit():
            die(f"--attach takes PORT or HOST:PORT, not {attach!r}")
        # FigCraft takes a bare port; every other app takes (or also accepts) HOST:PORT.
        address = port if app.key == "figcraft" else (attach if ":" in attach else f"127.0.0.1:{port}")
        note = f"; the bridge needs {app.attach_note}" if app.attach_note else ""
        log(f"start the app first with `{app.key} --control {port}`{note}")
        return ["mcp", app.attach, address]
    args = ["mcp"]
    if root:
        root = str(Path(root).expanduser().resolve())
        if app.roots:
            args += ["--automation-read-root", root, "--automation-write-root", root]
        elif app.key == "lightcraft":
            args += [root]  # imports the folder's photos; LightCraft has no folder sandbox
            log("LightCraft imports that folder but cannot be confined to it.")
        else:
            log(f"{app.title}'s MCP server has no folder sandbox: it can read and write anything you can. "
                "Prefer the CLI for one-off jobs, or run the server in a container.")
    return args


def cmd_mcp(args: argparse.Namespace) -> None:
    app = app_for(args.app)
    path, _ = find_existing(app)
    if path is None:
        if args.register:
            try:
                path = ensure(app)
            except InstallError as e:
                die(str(e))
        else:
            path = Path(exe(app.cli))
            log(f"{app.cli} is not installed yet; run `craft.py ensure {app.key}` first. Commands below assume it is on PATH.")
    argv = [str(path)] + mcp_args(app, args.root, args.attach) + args.extra
    name = args.name or app.key
    add = ["claude", "mcp", "add", "--scope", args.scope, name, "--"] + argv
    if args.register:
        claude = shutil.which("claude")
        if not claude:
            die("the claude CLI is not on PATH; add the server with the JSON below instead")
        subprocess.run([claude] + add[1:], check=False)
        return
    print("# Claude Code")
    print(" ".join(shlex.quote(a) for a in add))
    print("# Claude Desktop / .mcp.json")
    print(json.dumps({"mcpServers": {name: {"command": argv[0], "args": argv[1:]}}}, indent=2))


def cmd_remove(args: argparse.Namespace) -> None:
    keys = list(APPS) if args.all else [app_for(a).key for a in args.apps]
    state = load_state()
    for key in keys:
        p = BIN / exe(APPS[key].cli)
        if p.exists():
            p.unlink()
            log(f"removed {p}")
        state.pop(key, None)
    save_state(state)


def cmd_clean(args: argparse.Namespace) -> None:
    targets = []
    if args.src or not (args.src or args.target):
        targets.append(SRC)
    if args.target or not (args.src or args.target):
        targets.append(TARGET)
    for t in targets:
        if t.exists():
            shutil.rmtree(t)
            log(f"removed {t}")


def main(argv: Optional[List[str]] = None) -> None:
    p = argparse.ArgumentParser(prog="craft.py", description=__doc__.split("\n\n")[0],
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("apps", help="what each app is for")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_apps)

    s = sub.add_parser("status", help="installed CLIs and what this machine can do")
    s.add_argument("--json", action="store_true")
    s.add_argument("--online", action="store_true", help="also check whether GitHub downloads are reachable")
    s.set_defaults(fn=cmd_status)

    s = sub.add_parser("ensure", help="print the CLI's path, installing it first if needed")
    s.add_argument("app")
    s.add_argument("--from", dest="source", choices=["auto", "release", "source"], default="auto",
                   help="auto: release download, then a source build if downloads fail (default)")
    s.add_argument("--version", help="a specific release, e.g. 0.17.0 (default: latest release, or main for source)")
    s.add_argument("--update", action="store_true", help="reinstall even if a CLI is already present")
    s.add_argument("--no-verify", action="store_true", help="accept a download without a published SHA-256")
    s.add_argument("--jobs", type=int, help="cargo build jobs (lower it when memory is tight)")
    s.add_argument("--lto", action="store_true", help="keep the app's release LTO (slower build, faster binary)")
    s.set_defaults(fn=cmd_ensure)

    s = sub.add_parser("run", help="run the CLI with the given arguments")
    s.add_argument("app")
    s.add_argument("rest", nargs=argparse.REMAINDER)
    s.set_defaults(fn=cmd_run)

    s = sub.add_parser("mcp", help="print or register the app's MCP server")
    s.add_argument("app")
    s.add_argument("--root", help="confine the server's file reads and writes to this folder")
    s.add_argument("--attach", metavar="HOST:PORT", help="drive a running desktop app started with --control")
    s.add_argument("--name", help="server name (default: the app name)")
    s.add_argument("--scope", default="user", choices=["user", "project", "local"])
    s.add_argument("--register", action="store_true", help="run `claude mcp add` now")
    s.add_argument("extra", nargs="*", help="extra arguments passed to `<app>-cli mcp`")
    s.set_defaults(fn=cmd_mcp)

    s = sub.add_parser("remove", help="delete installed binaries")
    s.add_argument("apps", nargs="*")
    s.add_argument("--all", action="store_true")
    s.set_defaults(fn=cmd_remove)

    s = sub.add_parser("clean", help="delete source checkouts and/or the build cache")
    s.add_argument("--src", action="store_true")
    s.add_argument("--target", action="store_true")
    s.set_defaults(fn=cmd_clean)

    args = p.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
