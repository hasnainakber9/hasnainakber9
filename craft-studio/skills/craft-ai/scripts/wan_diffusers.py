#!/usr/bin/env python3
"""Generate a video with a Wan2.2 Diffusers checkpoint (text-to-video or image-to-video).

Runs inside the venv that `wan.py setup --route diffusers` creates (torch, diffusers,
transformers, accelerate). The model is a Hugging Face id or a local folder:

    Wan-AI/Wan2.2-TI2V-5B-Diffusers   text or image to video, 1280x704 / 704x1280, 24 fps, 121 frames
    Wan-AI/Wan2.2-T2V-A14B-Diffusers  text to video (two experts), 1280x720 or 832x480, 16 fps, 81 frames
    Wan-AI/Wan2.2-I2V-A14B-Diffusers  image to video (two experts), same sizes

    python wan_diffusers.py --model Wan-AI/Wan2.2-TI2V-5B-Diffusers --prompt "..." --out clip.mp4
    python wan_diffusers.py --model ... --image still.png --prompt "..." --out clip.mp4

Prints one JSON line with the output path, frames, fps, size and seconds taken.
"""
from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

NEGATIVE = ("Bright tones, overexposed, static, blurred details, subtitles, style, works, paintings, "
            "images, static, overall gray, worst quality, low quality, JPEG compression residue, ugly, "
            "incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, "
            "misshapen limbs, fused fingers, still picture, messy background, three legs, many people "
            "in the background, walking backwards")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--model", required=True, help="Hugging Face id or local Diffusers folder")
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--negative", default=NEGATIVE, help="negative prompt ('' for none)")
    ap.add_argument("--image", help="first frame for image-to-video")
    ap.add_argument("--width", type=int, help="default 1280 (I2V: the area, aspect from the image)")
    ap.add_argument("--height", type=int, help="default 704 for TI2V-5B, 720 for A14B")
    ap.add_argument("--frames", type=int, help="4n+1; default 121 (5B) or 81 (A14B)")
    ap.add_argument("--fps", type=int, help="default 24 (5B) or 16 (A14B)")
    ap.add_argument("--steps", type=int, default=None, help="default 50 (5B) or 40 (A14B)")
    ap.add_argument("--guidance", type=float, default=None, help="default 5.0 (5B), 4.0/3.5 (A14B)")
    ap.add_argument("--guidance2", type=float, default=None, help="low-noise expert guidance (A14B)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--offload", choices=["model", "sequential", "none"], default="model",
                    help="model: about 24 GB VRAM for 5B; sequential: lowest VRAM, slowest; none: fastest")
    ap.add_argument("--device", default="cuda", help="cuda, cuda:1, mps or cpu")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    import torch
    from diffusers import AutoencoderKLWan, WanImageToVideoPipeline, WanPipeline
    from diffusers.utils import export_to_video, load_image

    t0 = time.time()
    dtype = torch.bfloat16 if a.device != "cpu" else torch.float32
    vae = AutoencoderKLWan.from_pretrained(a.model, subfolder="vae", torch_dtype=torch.float32)
    cls = WanImageToVideoPipeline if a.image else WanPipeline
    pipe = cls.from_pretrained(a.model, vae=vae, torch_dtype=dtype)
    five_b = bool(pipe.config.get("expand_timesteps"))        # TI2V-5B; A14B uses two experts instead
    two_experts = getattr(pipe, "transformer_2", None) is not None

    width = a.width or 1280
    height = a.height or (704 if five_b else 720)
    frames = a.frames or (121 if five_b else 81)
    if (frames - 1) % 4:
        frames = 4 * round((frames - 1) / 4) + 1
    fps = a.fps or (24 if five_b else 16)
    steps = a.steps or (50 if five_b else 40)
    guidance = a.guidance if a.guidance is not None else (5.0 if five_b else (3.5 if a.image else 4.0))
    guidance2 = a.guidance2 if a.guidance2 is not None else (
        (3.5 if a.image else 3.0) if two_experts else None)

    kwargs = {}
    if a.image:
        image = load_image(a.image)
        # Keep the image's aspect ratio inside the requested area, on the model's pixel grid.
        mod = pipe.vae_scale_factor_spatial * pipe.transformer.config.patch_size[1]
        ratio = image.height / image.width
        area = width * height
        height = max(mod, round(math.sqrt(area * ratio)) // mod * mod)
        width = max(mod, round(math.sqrt(area / ratio)) // mod * mod)
        kwargs["image"] = image.resize((width, height))
    if guidance2 is not None:
        kwargs["guidance_scale_2"] = guidance2

    if a.device == "cpu" or a.offload == "none":
        pipe.to(a.device)
    elif a.offload == "sequential":
        pipe.enable_sequential_cpu_offload(device=a.device)
    else:
        pipe.enable_model_cpu_offload(device=a.device)

    gen = torch.Generator(device="cpu").manual_seed(a.seed)
    video = pipe(prompt=a.prompt, negative_prompt=a.negative or None, height=height, width=width,
                 num_frames=frames, num_inference_steps=steps, guidance_scale=guidance,
                 generator=gen, **kwargs).frames[0]
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    export_to_video(video, str(out), fps=fps)
    print(json.dumps({"output": str(out.resolve()), "frames": len(video), "fps": fps,
                      "width": width, "height": height, "seconds_taken": round(time.time() - t0, 1),
                      "model": a.model, "seed": a.seed, "steps": steps}))


if __name__ == "__main__":
    main()
