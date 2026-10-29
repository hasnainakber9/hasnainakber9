#!/usr/bin/env python3
"""Find or install Kdenlive and render its projects without a display.

    kden.py ensure [--update]                  print the kdenlive command, installing the AppImage if needed
    kden.py render PROJECT OUT [--preset P] [--profile NAME] [--force]
                                               render a .kdenlive project headlessly, then probe the result
    kden.py check PROJECT                      profile, document version and missing media of a project
    kden.py presets                            render preset names for --preset

Kdenlive (https://kdenlive.org, mirrored at github.com/KDE/kdenlive) is KDE's open-source
video editor built on MLT. `kdenlive --render` (24.02 and later) renders a project with the
app's own document loader, so effects, transitions and the project profile come out as they
do in the GUI. On Linux x86_64 the helper downloads the official AppImage from download.kde.org
and checks its SHA-256; elsewhere it uses an installed Kdenlive and says how to get one.

Installs go to $CRAFT_HOME/kdenlive (default ~/.craft-studio/kdenlive). Override the binary
with KDENLIVE=/path/to/kdenlive. Stdlib only; Python 3.8+.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from typing import List, NoReturn, Optional, Tuple

MIRROR = os.environ.get("KDENLIVE_MIRROR", "https://download.kde.org/stable/kdenlive").rstrip("/")
HOME = Path(os.environ.get("CRAFT_HOME") or Path.home() / ".craft-studio").expanduser() / "kdenlive"
USER_AGENT = "craft-studio-helper/1.0 (+https://github.com/hasnainakber9/hasnainakber9)"
TIMEOUT = 60

# Kdenlive 26.08 export presets (share/kdenlive/export/profiles.xml); MP4-H264/AAC is the default.
PRESETS = [
    "MP4-H264/AAC", "MP4-H265 (HEVC)", "Matroska-H264/AAC", "WebM-VP9/Opus (libre)",
    "WebM-AV1/Opus (libre-dav1d)", "WebM-VP8/Vorbis (libre)", "GIF High Quality", "MPEG-2",
    "Alpha MOV", "Alpha VP8", "Alpha VP9", "FFmpeg FFV1", "PNG with alpha", "VOB (DVD)",
    "MPEG4-ASP/MP3 (DivX compatible)", "Windows Media Player", "WAV", "FLAC", "MP3", "OGG", "AC3",
    "ALAC", "NVENC H264 VBR", "NVENC H264 ABR", "NVENC H265 ABR", "NVENC H265 ABR 10 bit",
    "NVENC AV1 VBR", "VAAPI H264", "Quick Sync Intel H264", "Quick Sync Intel H265",
    "VideoToolBox H264 ABR", "VideoToolBox H265 ABR", "AMF H264",
]

INSTALL_HINT = """Kdenlive is not installed here. Get it from https://kdenlive.org/download:
  Linux:   AppImage from download.kde.org (this helper does it on x86_64),
           flatpak install flathub org.kde.kdenlive, or your distro's package (24.02+ for --render)
  Windows: kdenlive-<ver>.exe or the _standalone.exe from download.kde.org/stable/kdenlive/
  macOS:   kdenlive-<ver>-arm64.dmg or -x86_64.dmg from the same place
Then run this again, or set KDENLIVE=/path/to/kdenlive."""


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def die(msg: str, code: int = 1) -> NoReturn:
    log(f"kden.py: {msg}")
    sys.exit(code)


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def vkey(v: str) -> Tuple[int, ...]:
    return tuple(int(p) for p in v.split("."))


def latest_appimage() -> Tuple[str, str]:
    """(file name, url) of the newest x86_64 AppImage on the KDE mirror."""
    series = re.findall(r'href="(\d+\.\d+)/"', fetch(MIRROR + "/").decode("utf-8", "replace"))
    for s in sorted(set(series), key=vkey, reverse=True):
        page = fetch(f"{MIRROR}/{s}/linux/").decode("utf-8", "replace")
        found = re.findall(r'href="(kdenlive-(\d+(?:\.\d+)+)-x86_64\.AppImage)"', page)
        if found:
            name = max(found, key=lambda f: vkey(f[1]))[0]
            return name, f"{MIRROR}/{s}/linux/{name}"
    die(f"no x86_64 AppImage listed under {MIRROR}")


def install_appimage() -> Path:
    name, url = latest_appimage()
    dest = HOME / name
    if dest.exists():
        return dest
    expected = fetch(url + ".sha256").decode().split()[0].lower()
    HOME.mkdir(parents=True, exist_ok=True)
    log(f"downloading {name} (about 200 MB)")
    h = hashlib.sha256()
    fd, tmp = tempfile.mkstemp(dir=HOME, suffix=".part")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with os.fdopen(fd, "wb") as f, urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            for chunk in iter(lambda: r.read(1 << 20), b""):
                h.update(chunk)
                f.write(chunk)
        if h.hexdigest() != expected:
            die(f"SHA-256 mismatch for {name}: got {h.hexdigest()}, expected {expected}")
        os.chmod(tmp, 0o755)
        os.replace(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    for old in HOME.glob("kdenlive-*-x86_64.AppImage"):
        if old != dest:
            old.unlink()
    log(f"installed {dest}")
    return dest


def headless_env(cmd: Path) -> dict:
    env = dict(os.environ)
    if sys.platform.startswith("linux"):
        env["QT_QPA_PLATFORM"] = "offscreen"      # no X or Wayland needed, and no dialogs to hang on
        if cmd.suffix == ".AppImage":
            env["APPIMAGE_EXTRACT_AND_RUN"] = "1"  # works without FUSE (containers)
    return env


def can_render(cmd: Path) -> bool:
    try:
        out = subprocess.run([str(cmd), "--help"], env=headless_env(cmd), capture_output=True,
                             text=True, timeout=120).stdout
    except (OSError, subprocess.TimeoutExpired):
        return False
    return "--render" in out


def candidates() -> List[Path]:
    found: List[Path] = []
    if os.environ.get("KDENLIVE"):
        found.append(Path(os.environ["KDENLIVE"]).expanduser())
    found += sorted(HOME.glob("kdenlive-*-x86_64.AppImage"), reverse=True)
    on_path = shutil.which("kdenlive")
    if on_path:
        found.append(Path(on_path))
    if sys.platform == "darwin":
        found.append(Path("/Applications/kdenlive.app/Contents/MacOS/kdenlive"))
    if os.name == "nt":
        for base in (os.environ.get("ProgramFiles", r"C:\Program Files"),
                     os.environ.get("LOCALAPPDATA", "")):
            if base:
                found.append(Path(base) / "kdenlive" / "bin" / "kdenlive.exe")
    return [p for p in found if p.is_file()]


def ensure(update: bool = False) -> Path:
    if not update:
        for cmd in candidates():
            if can_render(cmd):
                return cmd
            log(f"skipping {cmd}: too old for --render (needs Kdenlive 24.02 or later)")
    if sys.platform.startswith("linux") and platform.machine().lower() in ("x86_64", "amd64"):
        return install_appimage()
    die(INSTALL_HINT, 2)


def probe(path: Path) -> dict:
    if not shutil.which("ffprobe"):
        return {"bytes": path.stat().st_size}
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
                          "-of", "json", str(path)], capture_output=True, text=True).stdout
    data = json.loads(out or "{}")
    return {"bytes": path.stat().st_size,
            "duration": float(data.get("format", {}).get("duration", 0) or 0),
            "streams": data.get("streams", [])}


PROFILE_PROP = re.compile(r'(<property name="kdenlive:docproperties\.profile">)([^<]*)(</property>)')


def with_profile(project: Path, profile: str) -> Path:
    """Copy of the project, beside it so relative media paths still resolve, using `profile`."""
    text = project.read_text(encoding="utf-8")
    if PROFILE_PROP.search(text):
        text = PROFILE_PROP.sub(lambda m: m.group(1) + profile + m.group(3), text, count=1)
    else:
        anchor = re.search(r'<property name="kdenlive:docproperties\.[^"]+">[^<]*</property>', text)
        if not anchor:
            die(f"{project} has no kdenlive:docproperties; is it a Kdenlive project?")
        prop = f'<property name="kdenlive:docproperties.profile">{profile}</property>'
        text = text[:anchor.end()] + prop + text[anchor.end():]
    fd, tmp = tempfile.mkstemp(dir=project.parent, prefix=".kden-", suffix=".kdenlive")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    return Path(tmp)


def render(args: argparse.Namespace) -> None:
    project = Path(args.project).resolve()
    out = Path(args.out).resolve()
    if not project.is_file():
        die(f"no such project: {project}")
    if out.exists():
        if not args.force:
            die(f"{out} exists; Kdenlive will not overwrite it (use --force)")
        out.unlink()
    missing = report(project)["missing"]
    if missing:
        die("media missing, Kdenlive cannot render: " + ", ".join(missing), 3)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ensure()
    src = with_profile(project, args.profile) if args.profile else project
    argv = [str(cmd), "--render"]
    if args.preset:
        argv += ["--render-preset", args.preset]
    argv += [str(src), str(out)]
    try:
        rc = subprocess.run(argv, env=headless_env(cmd), stdout=subprocess.DEVNULL,
                            stderr=None if args.verbose else subprocess.DEVNULL).returncode
    finally:
        if src != project:
            src.unlink()
    if rc != 0 or not out.exists() or out.stat().st_size == 0:
        die(f"render failed (exit {rc}); rerun with --verbose to see Kdenlive's log")
    print(json.dumps({"output": str(out), **probe(out)}, indent=1))


def report(project: Path) -> dict:
    """Profile, document version and media files of a project, with the missing ones."""
    text = project.read_text(encoding="utf-8")
    m = PROFILE_PROP.search(text)
    root = re.search(r'<mlt[^>]*\broot="([^"]*)"', text)
    base = Path(root.group(1)) if root and root.group(1) else project.parent
    media, missing = set(), []
    for res in re.findall(r'<property name="resource">([^<]+)</property>', text):
        if res.startswith(("#", "0x")) or res in ("black", "<producer>") or "://" in res:
            continue                                   # colours, generators, URLs
        p = Path(res) if os.path.isabs(res) else base / res
        if p.suffix and p not in media:
            media.add(p)
            if not p.exists():
                missing.append(str(p))
    version = re.search(r'kdenlive:docproperties\.version">([^<]*)<', text)
    return {"profile": m.group(2) if m else None, "docversion": version.group(1) if version else None,
            "media": len(media), "missing": missing}


def check(args: argparse.Namespace) -> None:
    info = report(Path(args.project).resolve())
    print(json.dumps(info, indent=1))
    if info["missing"]:
        sys.exit(3)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("ensure", help="print the kdenlive command, installing it if needed")
    e.add_argument("--update", action="store_true", help="fetch the newest AppImage even if one works")
    r = sub.add_parser("render", help="render a .kdenlive project headlessly")
    r.add_argument("project")
    r.add_argument("out")
    r.add_argument("--preset", help="render preset name (default MP4-H264/AAC); see `presets`")
    r.add_argument("--profile", help="MLT profile to render at, e.g. atsc_1080p_30, vertical_hd_30")
    r.add_argument("--force", action="store_true", help="replace OUT if it exists")
    r.add_argument("--verbose", action="store_true", help="show Kdenlive's log")
    c = sub.add_parser("check", help="profile and missing media of a project")
    c.add_argument("project")
    sub.add_parser("presets", help="list render preset names")
    args = ap.parse_args()
    if args.cmd == "ensure":
        print(ensure(args.update))
    elif args.cmd == "render":
        render(args)
    elif args.cmd == "check":
        check(args)
    else:
        print("\n".join(PRESETS))


if __name__ == "__main__":
    main()
