---
name: craft-ai
description: Plan and run AI image, video, music, 3D mesh and 3D world generation with ArtCraft Studio (github.com/storytold/artcraft) through its hosted Omni API or guided desktop work (3D scene staging, character posing, inpainting, storyboards), and generate video with the open Wan2.2 models (github.com/Wan-Video/Wan2.2) on the user's NVIDIA GPU or through Alibaba Cloud Model Studio - text to video, image to video, a talking or singing video from a portrait and audio, character animation or replacement. Also covers the ArtCraft research repos (Spark Gaussian splats for three.js, video and voice model training, capture rigs, Unreal and Unity plugins). Use when the user mentions ArtCraft, storytold, FakeYou, Wan or Wan2.2, wants an AI video clip from a prompt or image, free or local or open-source video generation, controllable shots from a staged 3D scene, costs in ArtCraft credits, or Gaussian splats on the web.
license: MIT
compatibility: The ArtCraft Omni API needs the user's ArtCraft account and API key (paid credits); the desktop app is GUI-only. Wan2.2 locally needs an NVIDIA GPU (24 GB for TI2V-5B, 80 GB for the 14B models) and 34-126 GB of disk; scripts/wan.py sets it up, or uses Model Studio with DASHSCOPE_API_KEY. Research repos need Python or Node.
metadata:
  version: "1.1.0"
  author: "Syed Hasnain Akber"
---

# AI studio, open video models and research repos: ArtCraft, Wan2.2 and friends

ArtCraft Studio is ArtCraft's desktop app for AI images and video: compose on a 2D canvas, stage
scenes in 3D (subjects, cameras, focal length, kitbashed sets, posed mannequins), then generate
with the model you pick (Nano Banana, GPT Image, FLUX, Seedream, Midjourney, Seedance, Kling, Veo,
Sora, Wan, MiniMax, Suno, Hunyuan 3D, Marble and more). Unlike the free Crafting Apps it runs on
paid credits, and it is GUI-only: no CLI, no MCP server, no control channel.

Wan2.2 is the open route: Alibaba's Apache-2.0 video models, run with `generate.py` or Diffusers
on the user's GPU, or hosted on Model Studio. `scripts/wan.py` checks the machine and drives both.

## Pick the route

| The user wants | Route |
|---|---|
| A price before anything else | Cost endpoint (no sign-in): see below |
| Generated images or video they can describe in words, inputs as URLs or files | **Omni API** with their key, after they approve the spend |
| Shots staged in 3D, posed characters, masked inpainting, camera-angle edits, world building | **The desktop app**: Claude plans, prepares inputs and writes click-level steps |
| A clip from a prompt or an image with open models, free on their own GPU, or no ArtCraft account | **Wan2.2**: `wan.py doctor`, then local `generate` or hosted `api` (below) |
| A talking or singing video from a portrait and audio; animate a character with a reference video's motion | **Wan2.2** S2V-14B / Animate-14B (80 GB GPU) |
| A multi-shot production from an idea, with narration and captions | the video-studio skill if installed (it runs Wan through ComfyUI); finish in craft-av |
| Finishing the results | craft-image (PhotoCraft, LightCraft), craft-av (FilmCraft, EffectCraft, SoundCraft), craft-design |
| Gaussian splats on a web page, speech or video model training, capture rigs, Unreal/Unity plugins | `references/research-repos.md` |

## Costs and the Omni API

One credit is about one US cent; plans are $10, $35 and $60 a month (October 2026, check the
pricing page). Always quote the cost first and get a yes before any paid call:

```bash
curl -s https://api.storyteller.ai/v1/omni_gen/models/video                 # live model list, no sign-in
curl -s -X POST https://api.storyteller.ai/v1/omni_gen/cost/video -H 'Content-Type: application/json' \
  -d '{"model":"seedance_2p0","duration_seconds":5,"resolution":"seven_twenty_p","aspect_ratio":"wide_sixteen_by_nine"}'
# -> {"cost_in_credits":93,"cost_in_usd_cents":93,...}
```

Generation needs the user's API key (app.getartcraft.com › Settings › API Keys; staff enable API
access per account). The user puts it in an environment variable such as `ARTCRAFT_API_KEY`;
never print it, log it or write it into a file. Submit with a fresh `idempotency_token`, poll the
job, download the CDN result, and keep a manifest (prompt, model, job token, credits, file). The
full request shapes, upload flow, polling states and errors are in `references/artcraft.md`.

## Wan2.2: open video models

```bash
WAN="${CLAUDE_SKILL_DIR}/scripts/wan.py"
python3 "$WAN" doctor                                     # GPU/VRAM/disk -> route and model that fit
python3 "$WAN" setup --route official --model ti2v-5B     # venv + repo + flash-attn + 34 GB weights (diffusers route if flash-attn fails)
python3 "$WAN" generate --prompt "$P" --seconds 5 --out shot.mp4             # 1280x704 24 fps; --image F for image to video
python3 "$WAN" generate --model s2v-14B --image face.png --audio line.wav --prompt "$P" --out talk.mp4
python3 "$WAN" api --prompt "$P" --out shot.mp4 --dry-run  # no GPU: Model Studio (paid; quote first, DASHSCOPE_API_KEY)
```

Local renders take minutes per 5-second clip (TI2V-5B: under 9 min on an RTX 4090, per the Wan team): run them in
the background and tell the user the expected time. No NVIDIA GPU (Claude cloud sessions, Macs):
use `api`, wan.video or the Hugging Face Space, never pretend a local run happened. Models, VRAM,
flags, Animate preprocessing and prompt craft: `references/wan.md`.

## When the work needs the window

1. Plan the shots: per shot the model, aspect ratio, resolution, duration, references and a
   prompt within the model's limit; total credits from the cost endpoint.
2. Prepare inputs with the Crafting Apps: reference boards and plates (PhotoCraft), blocking
   diagrams and character turnarounds (VectorCraft, FigCraft), exact pixel sizes.
3. Write click-level steps for the user: 3D Editor (place the subject, camera height and focal
   length, short style prompt, generate, compare) or 2D Canvas (high-contrast sketch, small masks,
   short prompts, inpaint details).
4. Finish the outputs in craft-av and craft-image; deliver with model names and credits used.

## Rules

- Money: no paid generation without the user's explicit go-ahead on the quoted credits; render
  one sample before a batch; never switch models or providers silently after a failure.
- Wan2.2 is free to run locally but its licence bars harmful or misleading content; hosted Wan runs
  are paid per second, so quote and ask like any paid call.
- People: generate or alter a real person's likeness or voice only with their consent; no
  deceptive media of real people or events; label AI media where it is published.
- Licences: the ArtCraft app code is MIT OR Apache-2.0, but its NOTICE lists bundled assets with
  no licence granted, and the backend is under a fair-source licence. Provider terms apply to
  generated media. Some sign-in routes (Grok, Midjourney, Sora) drive consumer web accounts and can
  break or conflict with those providers' terms: point that out before relying on them.

## References

- `references/artcraft.md`: features, models, accounts, costs, install per OS, the Omni API in
  full, ArtCraft-X, the shared craft-ai-integrations layer, licences.
- `references/wan.md`: Wan2.2 models, routes by GPU, setup, generate and Diffusers commands, the
  Model Studio API, Animate and S2V, prompts, what was verified.
- `references/research-repos.md`: Spark, FineTrainers-Conditioning, cloud-worker, speech repos,
  capture repos and the Unreal/Unity plugins, each with status, licence and how to use it.
