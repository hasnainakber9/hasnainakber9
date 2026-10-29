---
name: craft-ai
description: Plan and run AI image, video, music, 3D mesh and 3D world generation with ArtCraft Studio (github.com/storytold/artcraft), the open-source AI studio for artists, through its hosted Omni API or step-by-step guidance in the desktop app (3D scene staging, character posing, 2D canvas inpainting, camera angles, storyboards), and use the ArtCraft/storytold research repos (Spark Gaussian-splat viewer for three.js, video-model fine-tuning with conditioning, VITS and Tacotron speech training, voice conversion, Kinect and Xsens capture, Unreal and Unity plugins). Use when the user mentions ArtCraft, getartcraft, storytold or FakeYou, wants controllable AI images or video from a staged 3D scene or posed characters, wants model costs in ArtCraft credits, wants to show or embed Gaussian splats on the web, or asks about training video or voice models with those repos.
license: MIT
compatibility: The ArtCraft Omni API needs the user's ArtCraft account and API key (paid credits). The desktop app runs on Windows and macOS (Linux from source) and has no CLI or MCP server. Research repos need Python or Node and often a GPU.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# AI studio and research repos: ArtCraft and friends

ArtCraft Studio is ArtCraft's desktop app for AI images and video: compose on a 2D canvas, stage
scenes in 3D (subjects, cameras, focal length, kitbashed sets, posed mannequins), then generate
with the model you pick (Nano Banana, GPT Image, FLUX, Seedream, Midjourney, Seedance, Kling, Veo,
Sora, Wan, MiniMax, Suno, Hunyuan 3D, Marble and more). Unlike the free Crafting Apps it runs on
paid credits, and it is GUI-only: no CLI, no MCP server, no control channel.

## Pick the route

| The user wants | Route |
|---|---|
| A price before anything else | Cost endpoint (no sign-in): see below |
| Generated images or video they can describe in words, inputs as URLs or files | **Omni API** with their key, after they approve the spend |
| Shots staged in 3D, posed characters, masked inpainting, camera-angle edits, world building | **The desktop app**: Claude plans, prepares inputs and writes click-level steps |
| Open or local models, no account | Not ArtCraft: say so and use another route (e.g. the video-studio skill if installed, or ComfyUI) |
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
- People: generate or alter a real person's likeness or voice only with their consent; no
  deceptive media of real people or events; label AI media where it is published.
- Licences: the ArtCraft app code is MIT OR Apache-2.0, but its NOTICE lists bundled assets with
  no licence granted, and the backend is under a fair-source licence. Provider terms apply to
  generated media. Some sign-in routes (Grok, Midjourney, Sora) drive consumer web accounts and can
  break or conflict with those providers' terms: point that out before relying on them.

## References

- `references/artcraft.md`: features, models, accounts, costs, install per OS, the Omni API in
  full, ArtCraft-X, the shared craft-ai-integrations layer, licences.
- `references/research-repos.md`: Spark, FineTrainers-Conditioning, cloud-worker, speech repos,
  capture repos and the Unreal/Unity plugins, each with status, licence and how to use it.
