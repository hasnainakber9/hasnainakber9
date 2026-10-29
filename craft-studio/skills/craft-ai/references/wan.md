# Wan2.2 (open video generation models)

[github.com/Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) is the open release of Wan2.2,
the video diffusion models from Alibaba's Wan team (Apache-2.0 code and weights; you own the
outputs, within the licence's use restrictions). It is the free, local alternative to the paid
models ArtCraft calls. There is no app, GUI or server, just `generate.py` and Python pipelines. It
needs an NVIDIA GPU, so the skill's helper picks a route that fits the machine:

```bash
WAN="${CLAUDE_SKILL_DIR}/scripts/wan.py"
python3 "$WAN" doctor                  # GPUs, VRAM, RAM, disk; prints the route and model that fit
```

Checked here (October 2026, repo commit 1ea34ff): the commands `wan.py` builds pass `generate.py`'s
own argument checks, and the Diffusers runner ran end to end on scaled-down random-weight copies of
all three Diffusers layouts. The Model Studio flow ran against a mock server, and the live endpoints
answered as documented. No full-size model was run, because this machine has no GPU. Treat the
first real render on a new machine as the test, and say so to the user.

## The models

| `--model` | Does | Output | Weights | GPU (one card) |
|---|---|---|---|---|
| `ti2v-5B` | text to video, or image + text to video | 1280x704 or 704x1280, 24 fps, 121 frames (5 s) | 34 GB | 24 GB with offloading (RTX 4090); under 9 min for 5 s per the Wan team |
| `t2v-A14B` | text to video, two 14B experts (high noise, low noise) | 1280x720 / 720x1280 / 832x480 / 480x832, 16 fps, 81 frames | 126 GB | 80 GB, or several GPUs |
| `i2v-A14B` | image + text to video (aspect from the image) | same | 126 GB | 80 GB, or several GPUs |
| `s2v-14B` | portrait image + speech or song to a talking or singing video; optional pose video | 1024x704 and others; length follows the audio | 49 GB | 80 GB |
| `animate-14B` | animate a character image with a driving video's motion, or replace the person in that video | 1280x720 / 720x1280, 30 fps | 72 GB | 80 GB |

All of them make silent video except S2V, which muxes the input audio. Frame counts are 4n+1
(`--seconds` rounds for you), and image-to-video `--size` is an area: the aspect comes from the image.

## Pick the route

| Machine | Route | Command |
|---|---|---|
| NVIDIA 80 GB (A100/H100/H200), or several GPUs | official code, any model | `setup --route official --model t2v-A14B` |
| NVIDIA 24-79 GB | official TI2V-5B with `--offload_model True --convert_model_dtype --t5_cpu` | `setup --route official` |
| flash-attn won't install (Windows, pre-Ampere GPUs such as T4/V100) | Diffusers | `setup --route diffusers` |
| NVIDIA 12-23 GB | Diffusers TI2V-5B with sequential offload (slow), or fp8/GGUF builds in ComfyUI | `setup --route diffusers` |
| No NVIDIA GPU (laptops, Macs, Claude cloud sessions) | hosted: Model Studio API, wan.video, the Hugging Face Space, or a rented GPU | `wan.py api` |

The `video-studio` skill, if installed, runs Wan 2.2 through ComfyUI with quantized models and
whole storyboards. Prefer it for multi-shot productions, and this route for a direct Wan render.

## Run it locally

```bash
python3 "$WAN" setup --route official --model ti2v-5B   # venv, repo, deps, flash-attn last, 34 GB of weights
python3 "$WAN" generate --prompt "$PROMPT" --seconds 5 --out shot1.mp4              # text to video
python3 "$WAN" generate --prompt "$PROMPT" --image frame.png --aspect 9:16 --out shot2.mp4
python3 "$WAN" generate --model s2v-14B --image host.png --audio line.wav --prompt "a woman speaks warmly to camera" --out talk.mp4
python3 "$WAN" generate ... --dry-run                  # print the exact command instead of running it
```

Everything lives under `$CRAFT_HOME/wan` (default `~/.craft-studio/wan`): `venv/`, `Wan2.2/` and
`models/<repo>/`. `setup` refuses without an NVIDIA GPU (`--force` overrides) or without room for the
weights plus about 15 GB. `generate` adds the offload flags when the card has under 80 GB. With
several GPUs it switches to `torchrun --nproc_per_node=N ... --dit_fsdp --t5_fsdp --ulysses_size N`
(N must divide the model's 40 heads for 14B models, or 24 for 5B).

Raw official commands, for reference:

```bash
cd ~/.craft-studio/wan/Wan2.2 && PY=../venv/bin/python
$PY generate.py --task ti2v-5B --size 1280*704 --ckpt_dir ../models/Wan2.2-TI2V-5B --offload_model True \
  --convert_model_dtype --t5_cpu --prompt "..." --save_file out.mp4 --base_seed 42 [--image in.jpg]
$PY generate.py --task t2v-A14B --size 1280*720 --ckpt_dir ../models/Wan2.2-T2V-A14B --offload_model True \
  --convert_model_dtype --prompt "..." --save_file out.mp4
$PY generate.py --task s2v-14B --size 1024*704 --ckpt_dir ../models/Wan2.2-S2V-14B --offload_model True \
  --convert_model_dtype --prompt "..." --image person.jpg --audio speech.wav [--pose_video pose.mp4] [--num_clip 2]
```

Other flags are `--frame_num` (4n+1), `--sample_steps` (defaults: 50 for 5B, 40 for A14B,
20 for Animate), `--sample_shift`, `--sample_guide_scale`, `--sample_solver unipc|dpm++` and
`--base_seed`. Prompt extension rewrites short prompts with Qwen: `--use_prompt_extend` takes
`--prompt_extend_method local_qwen` (downloads a Qwen model) or `dashscope` (needs `DASH_API_KEY`;
international accounts also set `DASH_API_URL=https://dashscope-intl.aliyuncs.com/api/v1`). Its
`--prompt_extend_target_lang` defaults to `zh`, so pass `en` for English prompts. Without
`--save_file` the output is named after the task, size, prompt and time in the repo folder.

Diffusers, when flash-attn is the problem or the GPU is small. `wan.py generate --route diffusers`
calls the bundled `scripts/wan_diffusers.py`, which you can also run yourself with the venv's
Python:

```bash
~/.craft-studio/wan/venv/bin/python "${CLAUDE_SKILL_DIR}/scripts/wan_diffusers.py" \
  --model Wan-AI/Wan2.2-TI2V-5B-Diffusers --prompt "..." [--image in.png] [--frames 121] \
  [--offload model|sequential|none] --out out.mp4     # prints {"output","frames","fps","width","height",...}
```

It loads `WanPipeline`, or `WanImageToVideoPipeline` when given `--image` (which works for TI2V-5B
too). It keeps the VAE in float32 and the rest in bfloat16, and passes the second guidance scale to
the A14B low-noise expert. It defaults to the Wan team's settings and exports at the model's fps.

## Hosted: Alibaba Cloud Model Studio

Paid per second of video; check the price on the Model Studio pricing page and get the user's yes
before the first call. They create an API key in Model Studio and set `DASHSCOPE_API_KEY`. Never
print it or write it to a file.

```bash
python3 "$WAN" api --prompt "$PROMPT" --out clip.mp4 --dry-run           # shows the request, sends nothing
python3 "$WAN" api --prompt "$PROMPT" --out clip.mp4                     # wan2.2-t2v-plus, 1920*1080, 5 s
python3 "$WAN" api --prompt "$PROMPT" --image frame.png --out clip.mp4   # wan2.2-i2v-flash, 720P
python3 "$WAN" api --prompt "$PROMPT" --image frame.png --model wan2.2-i2v-plus --resolution 1080P --out clip.mp4
```

The flow is POST `{API}/services/aigc/video-generation/video-synthesis` with
`X-DashScope-Async: enable`, then GET `{API}/tasks/{task_id}` every 15 s until `SUCCEEDED`, then
download `output.video_url`. That URL and the task id expire after 24 hours. `{API}` defaults to
`https://dashscope-intl.aliyuncs.com/api/v1` (Singapore); mainland accounts set
`DASHSCOPE_API_URL=https://dashscope.aliyuncs.com/api/v1`. The model, endpoint region and key
must match. Local images go up as base64 data URIs (JPEG/PNG without alpha/BMP/WEBP, 240-8000 px a
side, 10 MB max), or pass a public URL.

| Model | Input | Output |
|---|---|---|
| `wan2.2-t2v-plus` | text | 5 s, silent; `size` 1920*1080 / 1080*1920 (1080p tier) or 832*480 / 480*832 (480p) |
| `wan2.2-i2v-flash` | image + text | 5 s, silent; `resolution` 480P or 720P |
| `wan2.2-i2v-plus` | image + text | 5 s, silent; `resolution` 480P or 1080P |

Newer hosted Wan models (wan2.5 to wan2.7: longer clips, generated audio) use the same flow with
`--model`. wan2.7 takes `resolution` and `ratio` instead of `size`, so check the API reference
before using it. Server-side prompt rewriting is on by default; `--no-extend` turns it off.

Other hosted routes, all in the browser: [wan.video](https://wan.video), the Hugging Face Spaces
(`Wan-AI/Wan-2.2-5B`, `Wan-AI/Wan2.2-S2V`, `Wan-AI/Wan2.2-Animate`) and ModelScope Studio. ArtCraft
also offers Wan models on its credits (craft-ai's main routes).

## Animate (character animation and replacement)

Two stages, both on the GPU. Preprocessing needs extra models in
`Wan2.2-Animate-14B/process_checkpoint` (YOLOv10 detector, ViTPose, optionally SAM2 and
FLUX.1-Kontext-dev) and `requirements_animate.txt`:

```bash
cd ~/.craft-studio/wan/Wan2.2 && PY=../venv/bin/python
$PY wan/modules/animate/preprocess/preprocess_data.py --ckpt_path ../models/Wan2.2-Animate-14B/process_checkpoint \
  --video_path drive.mp4 --refer_path character.png --save_path work/ --resolution_area 1280 720 --retarget_flag --use_flux
$PY generate.py --task animate-14B --ckpt_dir ../models/Wan2.2-Animate-14B --src_root_path work/ --refert_num 1
# replacement: preprocess with --iterations 3 --k 7 --w_len 1 --h_len 1 --replace_flag (no retarget),
# then generate with --replace_flag --use_relighting_lora
```

Check the intermediate `src_pose.mp4`/`src_face.mp4` (and `src_mask.mp4` for replacement) before the
long render. Replacement masks are single-person only, and Wan2.2 LoRAs are not recommended with
Animate.

## Prompts that work

- One shot per clip: subject, action, setting, then camera (dolly in, pan left, aerial, handheld),
  lens and light (golden hour, rim light, soft overcast), mood and style. Short prompts work;
  richer ones steer more (the Wan team's image-to-video example is about 70 words).
- Describe motion explicitly. Wan2.2 was trained with labels for lighting, composition, contrast and
  colour tone, so those words steer it.
- For image-to-video, describe what moves and how the camera behaves, not what is already in the
  picture.
- The negative prompt in `wan_diffusers.py` is the Wan team's default (blur, static, extra fingers,
  and so on). Keep it unless it fights the brief.
- Lock the seed to iterate on the prompt, then vary the seed for alternatives.

## Finish and deliver

A clip is 5 s at most per render (121 frames at 24 fps, or 81 at 16 fps). Plan longer pieces as
shots and cut them in craft-av (FilmCraft or Kdenlive), add sound with SoundCraft or S2V, and
upscale or interpolate there if needed. Probe every output with ffprobe and look at stills before
delivering. Record the model, prompt, seed, size and route for each shot.

## Rules

- No likeness of a real person (S2V, Animate, image-to-video of a photo) without their consent;
  no deceptive media of real people or events; label AI video where it is published.
- The licence forbids sharing content that breaks the law, harms people, spreads misinformation or
  targets vulnerable groups. Refuse those requests regardless of route.
- Local runs are free but long. Start them in the background, and tell the user the GPU, model and
  expected time first. Hosted runs cost money, so quote and ask first.
