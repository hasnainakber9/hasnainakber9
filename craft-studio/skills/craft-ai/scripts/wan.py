#!/usr/bin/env python3
"""Run Wan2.2, the open video generation models from Wan-Video (Alibaba), on this machine or hosted.

    wan.py doctor [--json]                      GPUs, VRAM, disk and RAM; which route and model fit
    wan.py setup --route official|diffusers [--model M] [--no-weights]
                                                venv, code and weights under $CRAFT_HOME/wan
    wan.py generate --prompt P [--image IMG] [--audio WAV] [--model M] [--route R]
                    [--aspect 16:9|9:16] [--seconds S] [--seed N] --out OUT [--dry-run]
                                                text/image/speech to video; picks memory flags by VRAM
    wan.py api --prompt P [--image IMG|URL] [--model wan2.2-t2v-plus] --out OUT [--dry-run]
                                                Alibaba Cloud Model Studio (paid, DASHSCOPE_API_KEY)

Models (--model): ti2v-5B (text or image to video, 720p 24 fps, 24 GB GPU), t2v-A14B and
i2v-A14B (two 14B experts, 480p/720p 16 fps, 80 GB or several GPUs), s2v-14B (a portrait and
speech audio to a talking or singing video), animate-14B (character animation; preprocessing
first, see the reference). The official code needs an NVIDIA GPU with CUDA and flash-attn; the
Diffusers route also runs where flash-attn won't build. Stdlib only; Python 3.8+.
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import platform
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, NoReturn, Optional

HOME = Path(os.environ.get("CRAFT_HOME") or Path.home() / ".craft-studio").expanduser() / "wan"
VENV = HOME / "venv"
REPO = HOME / "Wan2.2"
MODELS = HOME / "models"
REPO_URL = "https://github.com/Wan-Video/Wan2.2.git"
API_URL = os.environ.get("DASHSCOPE_API_URL", "https://dashscope-intl.aliyuncs.com/api/v1").rstrip("/")
HERE = Path(__file__).resolve().parent

# Hugging Face repos, download size (GB), VRAM for one GPU with offloading (GB), defaults.
SPECS: Dict[str, dict] = {
    "ti2v-5B": dict(hf="Wan-AI/Wan2.2-TI2V-5B", diffusers="Wan-AI/Wan2.2-TI2V-5B-Diffusers", gb=34,
                    vram=24, fps=24, frames=121, sizes={"16:9": "1280*704", "9:16": "704*1280"}),
    "t2v-A14B": dict(hf="Wan-AI/Wan2.2-T2V-A14B", diffusers="Wan-AI/Wan2.2-T2V-A14B-Diffusers", gb=126,
                     vram=80, fps=16, frames=81, sizes={"16:9": "1280*720", "9:16": "720*1280"}),
    "i2v-A14B": dict(hf="Wan-AI/Wan2.2-I2V-A14B", diffusers="Wan-AI/Wan2.2-I2V-A14B-Diffusers", gb=126,
                     vram=80, fps=16, frames=81, sizes={"16:9": "1280*720", "9:16": "720*1280"}),
    "s2v-14B": dict(hf="Wan-AI/Wan2.2-S2V-14B", diffusers=None, gb=49, vram=80, fps=16, frames=None,
                    sizes={"16:9": "1024*704", "9:16": "704*1024"}),
    "animate-14B": dict(hf="Wan-AI/Wan2.2-Animate-14B", diffusers="Wan-AI/Wan2.2-Animate-14B-Diffusers",
                        gb=72, vram=80, fps=30, frames=77, sizes={"16:9": "1280*720", "9:16": "720*1280"}),
}


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def die(msg: str, code: int = 1) -> NoReturn:
    log(f"wan.py: {msg}")
    sys.exit(code)


def run(cmd: List[str], **kw) -> None:
    log("+ " + " ".join(cmd))
    if subprocess.run(cmd, **kw).returncode != 0:
        die(f"command failed: {cmd[0]} {' '.join(cmd[1:3])} ...")


# ---------------------------------------------------------------- machine

def gpus() -> List[dict]:
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
                              "--format=csv,noheader,nounits"], capture_output=True, text=True,
                             timeout=30).stdout
    except (OSError, subprocess.TimeoutExpired):
        return []
    found = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 2 and parts[1].isdigit():
            found.append({"name": parts[0], "vram_gb": round(int(parts[1]) / 1024),
                          "driver": parts[2] if len(parts) > 2 else ""})
    return found


def ram_gb() -> Optional[int]:
    try:
        with open("/proc/meminfo") as f:
            return round(int(f.readline().split()[1]) / 1024 / 1024)
    except OSError:
        return None


def free_gb(path: Path) -> int:
    path.mkdir(parents=True, exist_ok=True)
    return shutil.disk_usage(path).free // 1_000_000_000


def advise(g: List[dict]) -> dict:
    vram = max((x["vram_gb"] for x in g), default=0)
    n = len(g)
    if not g:
        apple = sys.platform == "darwin" and platform.machine() == "arm64"
        return {"route": "api", "model": "wan2.2-t2v-plus / wan2.2-i2v-flash",
                "why": "no NVIDIA GPU" + (" (Apple Silicon: Diffusers on mps is possible but very slow)"
                                          if apple else "")
                       + "; use Model Studio (wan.py api), wan.video, the Hugging Face Space, "
                         "or a cloud GPU (24 GB for TI2V-5B, 80 GB for A14B)"}
    if vram >= 80 or (n >= 4 and vram >= 40):
        return {"route": "official", "model": "t2v-A14B / i2v-A14B / ti2v-5B / s2v-14B / animate-14B",
                "why": f"{n} GPU(s), {vram} GB each: every model fits"}
    if vram >= 24:
        return {"route": "official", "model": "ti2v-5B",
                "why": f"{vram} GB: TI2V-5B with offloading (A14B needs 80 GB, or Diffusers "
                       "--offload sequential with lots of RAM and patience)"}
    if vram >= 12:
        return {"route": "diffusers", "model": "ti2v-5B",
                "why": f"{vram} GB: TI2V-5B through Diffusers with --offload sequential (slow), or "
                       "fp8/GGUF builds in ComfyUI"}
    return {"route": "api", "model": "wan2.2-t2v-plus / wan2.2-i2v-flash",
            "why": f"{vram} GB is too little for Wan2.2 locally"}


def doctor(args: argparse.Namespace) -> None:
    g = gpus()
    info = {"gpus": g, "ram_gb": ram_gb(), "disk_free_gb": free_gb(HOME), "home": str(HOME),
            "python": platform.python_version(), "venv": VENV.exists(), "repo": REPO.exists(),
            "models": sorted(p.name for p in MODELS.glob("*")) if MODELS.exists() else [],
            "dashscope_key": bool(os.environ.get("DASHSCOPE_API_KEY")), "advice": advise(g)}
    if args.json:
        print(json.dumps(info, indent=1))
        return
    for k, v in info.items():
        print(f"{k:14} {v}")


# ---------------------------------------------------------------- setup

def py() -> str:
    return str(VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python"))


def setup(args: argparse.Namespace) -> None:
    spec = SPECS[args.model]
    if args.route == "diffusers" and not spec["diffusers"]:
        die(f"{args.model} has no Diffusers checkpoint; use --route official")
    if not args.no_weights and free_gb(HOME) < spec["gb"] + 15:
        die(f"{args.model} needs about {spec['gb']} GB of weights plus room for the venv; "
            f"{free_gb(HOME)} GB free under {HOME} (set CRAFT_HOME to a bigger disk)")
    if not gpus() and not args.force:
        die("no NVIDIA GPU here; Wan2.2 would not run. Use `wan.py api`, or pass --force to "
            "prepare files anyway", 2)
    if not VENV.exists():
        run([sys.executable, "-m", "venv", str(VENV)])
    pip = [py(), "-m", "pip", "install", "-q"]
    run(pip + ["--upgrade", "pip", "setuptools", "wheel"])
    run(pip + ["torch>=2.4.0", "torchvision", "torchaudio"])
    if args.route == "official":
        if not REPO.exists():
            run(["git", "clone", "--depth", "1", REPO_URL, str(REPO)])
        reqs = [l for l in (REPO / "requirements.txt").read_text().splitlines()
                if l.strip() and not l.startswith("flash_attn")]
        run(pip + reqs)
        extra = {"s2v-14B": "requirements_s2v.txt", "animate-14B": "requirements_animate.txt"}
        if args.model in extra:
            run(pip + ["-r", str(REPO / extra[args.model])])
        # flash-attn goes last and without build isolation; the model code requires it.
        rc = subprocess.run(pip + ["flash_attn", "--no-build-isolation"]).returncode
        if rc != 0:
            log("flash_attn did not install (needs CUDA build tools and an Ampere or newer GPU); "
                "the official code will not run. Use --route diffusers instead.")
    else:
        run(pip + ["diffusers>=0.35.0", "transformers>=4.49.0", "accelerate>=1.1.1", "ftfy",
                   "imageio", "imageio-ffmpeg", "sentencepiece", "huggingface_hub"])
    if not args.no_weights:
        repo = spec["hf"] if args.route == "official" else spec["diffusers"]
        dest = MODELS / repo.split("/")[1]
        run(pip + ["huggingface_hub"])
        log(f"downloading {repo} (about {spec['gb']} GB) to {dest}")
        run([py(), "-c", "import sys; from huggingface_hub import snapshot_download; "
             "snapshot_download(sys.argv[1], local_dir=sys.argv[2])", repo, str(dest)])
    print(json.dumps({"venv": str(VENV), "repo": str(REPO) if args.route == "official" else None,
                      "models": str(MODELS)}))


# ---------------------------------------------------------------- generate

def frames_for(seconds: Optional[float], fps: int, default: Optional[int]) -> Optional[int]:
    if not seconds:
        return default
    return 4 * max(1, round(seconds * fps / 4)) + 1


def generate(args: argparse.Namespace) -> None:
    model = args.model or ("s2v-14B" if args.audio else "ti2v-5B")
    spec = SPECS[model]
    if model == "animate-14B":
        die("animate-14B needs preprocessing first; follow references/wan.md (Animate)")
    if model == "i2v-A14B" and not args.image:
        die("i2v-A14B needs --image")
    if model == "s2v-14B" and not (args.image and args.audio):
        die("s2v-14B needs --image (the person) and --audio (their speech or song)")
    g = gpus()
    vram = max((x["vram_gb"] for x in g), default=0)
    route = args.route
    if not route:
        if not spec["diffusers"] or (MODELS / spec["hf"].split("/")[1]).exists():
            route = "official"
        elif (MODELS / spec["diffusers"].split("/")[1]).exists():
            route = "diffusers"
        else:
            route = "official" if vram >= 24 else "diffusers"
    out = Path(args.out).resolve()
    if route == "official":
        ckpt = Path(args.ckpt or MODELS / spec["hf"].split("/")[1])
        size = args.size or spec["sizes"][args.aspect]
        cmd = [py(), "generate.py", "--task", model, "--size", size, "--ckpt_dir", str(ckpt),
               "--prompt", args.prompt, "--save_file", str(out), "--base_seed", str(args.seed)]
        frames = frames_for(args.seconds, spec["fps"], None)
        if frames and model != "s2v-14B":
            cmd += ["--frame_num", str(frames)]
        if args.image:
            cmd += ["--image", str(Path(args.image).resolve())]
        if args.audio:
            cmd += ["--audio", str(Path(args.audio).resolve())]
        heads = 24 if model == "ti2v-5B" else 40          # --ulysses_size must divide these
        n = max(k for k in range(1, len(g) + 1) if heads % k == 0) if g else 1
        if n > 1:
            cmd = [str(VENV / "bin/torchrun"), f"--nproc_per_node={n}"] + cmd[1:] + [
                "--dit_fsdp", "--t5_fsdp", "--ulysses_size", str(n)]
        elif vram < 80:
            cmd += ["--offload_model", "True", "--convert_model_dtype"]
            if model == "ti2v-5B":
                cmd += ["--t5_cpu"]
        cwd = REPO
    else:
        if not spec["diffusers"]:
            die(f"{model} has no Diffusers checkpoint; use --route official")
        local = MODELS / spec["diffusers"].split("/")[1]
        w, h = (args.size or spec["sizes"][args.aspect]).split("*")
        cmd = [py(), str(HERE / "wan_diffusers.py"), "--model", args.ckpt or (str(local) if local.exists()
               else spec["diffusers"]), "--prompt", args.prompt, "--width", w, "--height", h,
               "--seed", str(args.seed), "--out", str(out),
               "--offload", "none" if vram >= 80 else ("model" if vram >= 24 else "sequential")]
        frames = frames_for(args.seconds, spec["fps"], None)
        if frames:
            cmd += ["--frames", str(frames)]
        if args.image:
            cmd += ["--image", str(Path(args.image).resolve())]
        cwd = None
    if args.dry_run:
        print(json.dumps({"route": route, "model": model, "cwd": str(cwd) if cwd else None, "cmd": cmd}))
        return
    if not g:
        die("no NVIDIA GPU here; use `wan.py api` or another machine (see `wan.py doctor`)", 2)
    if not Path(py()).exists():
        die(f"run `wan.py setup --route {route} --model {model}` first")
    t0 = time.time()
    run(cmd, cwd=cwd)
    if not out.exists():
        die(f"no output at {out}")
    print(json.dumps({"output": str(out), "model": model, "route": route,
                      "minutes": round((time.time() - t0) / 60, 1)}))


# ---------------------------------------------------------------- hosted API

def api_call(url: str, key: str, body: Optional[dict] = None) -> dict:
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if body is not None:
        headers["X-DashScope-Async"] = "enable"
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers=headers, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        die(f"Model Studio returned HTTP {e.code}: {detail}")


def api(args: argparse.Namespace) -> None:
    model = args.model or ("wan2.2-i2v-flash" if args.image else "wan2.2-t2v-plus")
    body: dict = {"model": model, "input": {"prompt": args.prompt}, "parameters": {
        "prompt_extend": not args.no_extend, "watermark": False}}
    if args.negative:
        body["input"]["negative_prompt"] = args.negative
    if args.seed is not None:
        body["parameters"]["seed"] = args.seed
    if args.image:
        if args.image.startswith(("http://", "https://")):
            body["input"]["img_url"] = args.image
        else:
            data = Path(args.image).read_bytes()
            if len(data) > 10 * 1024 * 1024:
                die("Model Studio takes images up to 10 MB")
            mime = mimetypes.guess_type(args.image)[0] or "image/png"
            body["input"]["img_url"] = f"data:{mime};base64,{base64.b64encode(data).decode()}"
        body["parameters"]["resolution"] = args.resolution or ("720P" if "flash" in model else "1080P")
    else:
        body["parameters"]["size"] = args.size or "1920*1080"
    if args.dry_run:
        shown = json.loads(json.dumps(body))
        if shown["input"].get("img_url", "").startswith("data:"):
            shown["input"]["img_url"] = shown["input"]["img_url"][:40] + "..."
        print(json.dumps({"url": f"{API_URL}/services/aigc/video-generation/video-synthesis",
                          "body": shown}, indent=1))
        return
    key = os.environ.get("DASHSCOPE_API_KEY")
    if not key:
        die("set DASHSCOPE_API_KEY (Alibaba Cloud Model Studio › API keys); for the international "
            "site the default DASHSCOPE_API_URL is right, mainland China uses "
            "https://dashscope.aliyuncs.com/api/v1", 2)
    task = api_call(f"{API_URL}/services/aigc/video-generation/video-synthesis", key, body)
    task_id = task.get("output", {}).get("task_id") or die(f"no task id in {task}")
    log(f"task {task_id} submitted; polling every 15 s")
    deadline = time.time() + args.timeout
    while True:
        res = api_call(f"{API_URL}/tasks/{task_id}", key)
        status = res.get("output", {}).get("task_status")
        if status == "SUCCEEDED":
            break
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            die(f"task {status}: {res.get('output', {}).get('message', res)}")
        if time.time() > deadline:
            die(f"still {status} after {args.timeout} s; poll later: GET {API_URL}/tasks/{task_id}")
        time.sleep(float(os.environ.get("WAN_POLL_SECONDS", "15")))
    url = res["output"]["video_url"]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r, open(out, "wb") as f:
        shutil.copyfileobj(r, f)             # the URL expires after 24 hours
    print(json.dumps({"output": str(out.resolve()), "model": model, "task_id": task_id,
                      "usage": res.get("usage", {})}))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("doctor", help="what this machine can run")
    d.add_argument("--json", action="store_true")
    s = sub.add_parser("setup", help="venv, code and weights")
    s.add_argument("--route", choices=["official", "diffusers"], default="official")
    s.add_argument("--model", choices=list(SPECS), default="ti2v-5B")
    s.add_argument("--no-weights", action="store_true", help="skip the model download")
    s.add_argument("--force", action="store_true", help="set up even without an NVIDIA GPU")
    g = sub.add_parser("generate", help="generate a video locally")
    g.add_argument("--prompt", required=True)
    g.add_argument("--image", help="first frame / reference image")
    g.add_argument("--audio", help="speech or song for s2v-14B")
    g.add_argument("--model", choices=list(SPECS))
    g.add_argument("--route", choices=["official", "diffusers"])
    g.add_argument("--ckpt", help="weights folder or Hugging Face id (default: the one setup fetched)")
    g.add_argument("--aspect", choices=["16:9", "9:16"], default="16:9")
    g.add_argument("--size", help="exact W*H from the model's list (overrides --aspect)")
    g.add_argument("--seconds", type=float, help="length; frames are rounded to 4n+1")
    g.add_argument("--seed", type=int, default=42)
    g.add_argument("--out", required=True)
    g.add_argument("--dry-run", action="store_true", help="print the command only")
    a = sub.add_parser("api", help="generate through Alibaba Cloud Model Studio (paid)")
    a.add_argument("--prompt", required=True)
    a.add_argument("--negative")
    a.add_argument("--image", help="local file (sent as base64, 10 MB max) or public URL")
    a.add_argument("--model", help="default wan2.2-t2v-plus, or wan2.2-i2v-flash with --image")
    a.add_argument("--size", help="text-to-video W*H, default 1920*1080 (480p tier: 832*480)")
    a.add_argument("--resolution", help="image-to-video tier: 480P, 720P (flash) or 1080P (plus)")
    a.add_argument("--seed", type=int)
    a.add_argument("--no-extend", action="store_true", help="turn off server-side prompt rewriting")
    a.add_argument("--timeout", type=int, default=900, help="seconds to wait for the task")
    a.add_argument("--out", required=True)
    a.add_argument("--dry-run", action="store_true", help="print the request without sending it")
    args = ap.parse_args()
    {"doctor": doctor, "setup": setup, "generate": generate, "api": api}[args.cmd](args)


if __name__ == "__main__":
    main()
