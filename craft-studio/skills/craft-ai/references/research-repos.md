# storytold research, ML, capture and game-engine repos

The storytold org grew out of Storyteller / FakeYou (text-to-speech, voice conversion, virtual
production), so it holds experiments from 2019-2025 and several forks. None is a maintained
product or has storytold-built releases (fakeyou-recast has prerelease tags; LiveScan3D and the
two Runtime* plugins carry their upstream's tags). Reach for one only when the job matches
closely, and prefer the upstream project when the repo is a fork. "Last" is the last commit on
the default branch, checked 2026-10-29. Licences are as found in the repo root: "none" means no
licence file, so treat the code as all rights reserved.

| Repo | Group | Last | Licence | Verdict |
|---|---|---|---|---|
| spark | Gaussian splats (web) | 2025-11 | MIT (World Labs) | Useful; use upstream npm package |
| FineTrainers-Conditioning | Video-model training | 2025-01 (branches 2025-02) | Apache-2.0 | Fork of finetrainers; WIP branches |
| cloud-worker | Video-model serving | 2026-08 | none | Recent notes for MiniMax H3 on ComfyUI |
| storyteller-ml | ML monorepo | 2025-02 | none at root | Vendored copies; use upstreams |
| vits-finetuning | TTS training | 2023-06 | MIT | Stale; still runs on Colab-class GPUs |
| torchscript-models | TorchScript export notes | 2020-11 | none | Stale; notes only |
| fakeyou-recast | Real-time voice conversion app | 2023-03 | none | Stale; external model links |
| realtime-voice-conversion | Voice conversion | 2020-09 | none | Archived |
| LiveScan3D | Volumetric capture | 2020-08 | MIT | Fork; discontinued sensors |
| cloudcam, CloudCamPlugin, point-generator | Point clouds to Unreal | 2021-2022 | none | WIP demos |
| k4a-sys-temp | Azure Kinect Rust bindings | 2021-01 | MIT-style | README: "Do not use." |
| bevy-mocap | Facial mocap in Bevy | 2024-02 | none | Bevy 0.12 era |
| xsens-packet-send, motion-capture-data | Xsens mocap | 2022 | none | Niche, still works offline |
| UE4-OSC | Unreal plugin | 2020-10 | MIT | Archived fork |
| RuntimeAudioImporter, RuntimeFilesDownloader | Unreal plugins | 2021 | MIT | Old forks |
| UnrealZeroMQ, EventCenterPlugin, ActorSpawningPlugin | Unreal plugins | 2021 | none | Fork / WIP / stub |
| Azure-Kinect-Sample-for-Unity | Unity sample | 2020-11 | MIT | Fork; discontinued sensor |

Clone any of them with `git clone --depth 1 https://github.com/storytold/<repo>`.

## Gaussian splats

**spark**: "An advanced 3D Gaussian Splatting renderer for THREE.js": fuses splats with meshes,
targets 98%+ WebGL2 devices, reads PLY (and compressed PLY), SPZ, SPLAT, KSPLAT and SOG, renders
several splat objects with correct sorting, and edits, recolors, displaces and animates splats on
the GPU. A fork of World Labs' Spark, synced to about 0.1.10 (Oct 2025) plus two small storytold
commits. ArtCraft itself depends on the upstream npm package (`@sparkjsdev/spark ^0.1.10`).
- Use it to show ArtCraft or World Labs Marble splat worlds on a web page, build a splat viewer,
  or convert PLY to SPZ.
- Use: `npm install @sparkjsdev/spark three`, or the README's import map (three.js 0.178 from
  cdnjs, `https://sparkjs.dev/releases/spark/0.1.10/spark.module.js`), then
  `scene.add(new SplatMesh({ url: "scene.spz" }))`. Building the fork's examples:
  `npm install && npm run build` (needs Rust for the wasm part), `npm start` (localhost:8080).
  Compress: `npm run assets:compress <file-or-url.ply>`. Docs: sparkjs.dev.

## Video models

**FineTrainers-Conditioning**: a fork of `finetrainers` (formerly cogvideox-factory) for LoRA and
full fine-tuning of video models with Diffusers. Main is the upstream snapshot of 2025-01-14 (LTX-Video,
HunyuanVideo, CogVideoX text-to-video). storytold's own work is on WIP branches
(`feature/condition_patchify`, `feature/cross_attn_patchify`, `feature/simple-condition`,
Feb 2025) adding conditioning adapters; the last commit message on one is a TODO about a bug.
- Use it only to study those conditioning experiments; for training, use upstream finetrainers
  or another maintained trainer, which cover newer models (unverified).
- Use: `pip install -r requirements.txt` and `pip install git+https://github.com/huggingface/diffusers`;
  PyTorch 2.5.1+ (older versions can produce black videos); data from
  `huggingface-cli download --repo-type dataset Wild-Heart/Disney-VideoGeneration-Dataset
  --local-dir video-dataset-disney`; then `accelerate launch --config_file
  accelerate_configs/uncompiled_2.yaml --gpu_ids 0 train.py --model_name ltx_video
  --pretrained_model_name_or_path Lightricks/LTX-Video --data_root <dir> --training_type lora ...`
  (full flag list in the README). Minimum LoRA VRAM: LTX-Video 11 GB, CogVideoX-5b 21 GB,
  HunyuanVideo 42 GB.

**cloud-worker** (Aug 2026): scripts and notes for running the open-weights MiniMax H3 video model
(stereo audio, 24 fps, 5-15 s) in ComfyUI on a RunPod B200: text, image and reference-to-video
workflows, weight download and install scripts, a benchmark harness
(`python3 bench/minimax_bench.py --task t2v --width 864 --height 480 --seconds 5`), and docs on
weights, OOM mitigations per GPU class, concurrency and cost per video.
- Use it as a recipe when the user wants MiniMax H3 on their own GPU server. The scripts assume
  the team's pod layout (`/workspace/minimax-h3`, ComfyUI on 127.0.0.1:8188); the README names
  the team's own pod address: never connect to it.

## Speech: TTS and voice conversion

Clone or convert a real person's voice only with that person's permission.

**storyteller-ml**: the Storyteller ML monorepo, mostly vendored copies of third-party projects,
each with its own licence: `tts/` (F5-TTS, GPT-SoVITS, StyleTTS2, VALL-E-X, Tacotron 2 variants,
VITS), `voice_conversion/` (RVC v2, seed-vc, so-vits-svc, SoftVC), `animation/` (SadTalker,
StableAnimator, UniAnimate, animate-x, MocapNET, Rerender-A-Video, TokenFlow), `3d_generation/`
(TripoSR), `stem_separation/` (MDX and VR architectures), `workflows/comfy` (ComfyUI setup),
`llm/` (an NSFW filter). Setup notes in `_develop/`: Ubuntu 22.04, `python3.11-venv`, Docker;
Windows unsupported, macOS TODO.
- Use it to see how the team ran a model, then install that model from its upstream repo.

**vits-finetuning**: a heavily modified VITS (iSTFTNet generator, Avocodo discriminators, Mixer-TTS
attention, TinyBERT context, TorchMoji emotion, ARPA phonemizer) with gradient accumulation and an
8-bit optimizer, so fine-tuning fits 11-14 GB of VRAM (Colab). Exports TorchScript.
- Use it for a single-speaker English voice on a small GPU. The newer models vendored in
  storyteller-ml (F5-TTS, StyleTTS2, GPT-SoVITS) work from short samples (unverified here).
- Use: install `requirements.txt` (and `apt-get install espeak`); train
  `python train.py -c ./configs/ljs_li44_tmbert_ft_small_s1_arpa.json -m "train/MyVoice" -p pt_hanashi`
  (`-p` warm-starts from a pretrained model you must supply; `--use-latest` saves disk); export
  `python export_ts.py --checkpoint G_latest.pth --device cpu --config <cfg> --out-path voice.pt
  --test-string "Hello"`; synthesize `python infer_ts.py --out-path res --device cpu --config <cfg>
  --checkpoint voice.pt --text "Hello"` (export and inference device must match).

**torchscript-models** (README title "jit-models"): notes and harnesses for turning PyTorch TTS
models (glow-tts, multi-speaker glow-tts, HiFi-GAN, MelGAN) into TorchScript for Rust/libtorch,
with fixes for common scripting errors. Some submodules use SSH URLs
(`git@github.com:ml-applications/...`), which need GitHub SSH access to clone.
- Use the porting notes when exporting an old PyTorch model for libtorch.

**fakeyou-recast**: a Rust desktop app for recorded or real-time voice conversion with SoftVC
acoustic models and a HiFi-GAN vocoder, both TorchScript. Needs Rust, libtorch 1.13.0 (cxx11 ABI),
the CUDA toolkit and a GPU driver; models come from Nextcloud and Google Drive links in the README
(availability unverified). Run `cargo run --release --bin fakeyou-recast --features=devmode`, load
the `.recast` model and `hifigan-jit.pt`, pick audio devices, record or press realtime.

**realtime-voice-conversion** (archived, 2020): a Rust audio I/O binary that streams microphone
audio over protobuf/ZeroMQ to a Python CycleGAN-VC sidecar (`CUDA_VISIBLE_DEVICES=1
./sidecar.py`). The README measured 4.4-6 s of latency. For voice conversion today, start from
RVC v2 or seed-vc (vendored in storyteller-ml; install from upstream).

## Volumetric capture and motion capture

Azure Kinect DK and Kinect v2 hardware is no longer sold new (Microsoft ended Azure Kinect in
2023; unverified), so these suit people who already own the sensors.

**LiveScan3D** (fork of Marek Kowalski's project, MIT): real-time 3D reconstruction from several
Kinect v2 or Azure Kinect sensors into one coloured point cloud; record, visualise or stream it to
Unity/HoloLens. Windows only: Visual Studio 2019 or the upstream binary release; a client per
sensor and one server for calibration, filtering and synchronised capture; manual in `docs/`.
Azure Kinect support is on the `AzureKinect` branch.

**cloudcam** + **CloudCamPlugin** + **point-generator** (2021-2022 demos): cloudcam is a Rust server
that polls Azure Kinect cameras and streams point clouds over ZeroMQ (binary `cloudcam_zeromq`;
tested on Ubuntu 20.04 with the Sensor SDK built from source, clang, cmake, SDL2 and GLFW headers,
udev rule `99-k4a.rules`, `usbcore.usbfs_memory_mb=2047`). CloudCamPlugin is the Unreal side
(copy into `Plugins/`, rename to `CloudCam`, needs UnrealZeroMQ, set `CloudCamActor`'s Point Cloud
Renderer to `CloudCam_NiagaraSystem`). point-generator sends synthetic points for the same demo
(on Windows use `zmq = { version = "0.9", features = ["vendored"] }`).

**k4a-sys-temp**: a patched fork of `k4a-sys`, bindgen bindings for the Azure Kinect Sensor SDK 1.3.
Its README says "This fork is a hack. Do not use." Prefer upstream `k4a-sys`.

**bevy-mocap**: drives Bevy shape keys and bones from ARKit facial capture (CSV + mapping JSON +
`.morph_anim.json`), built for storyteller.ai on Bevy 0.12; current Bevy needs porting. Example:
`cargo run --example simple_example`; register `CSVAnimationLoader` and load the
`.morph_anim.json` like any animation clip.

**xsens-packet-send** + **motion-capture-data**: a Rust tool that replays recorded Xsens MVN
network packets (`.pcap`) to Unreal without paying for MVN Animate Pro, plus the raw Xsens
recordings (`.mvn`/`.mvns`, a three-dancer session). Run
`cargo run --release -- --file three_dancers_animation.pcap --host 127.0.0.1:<port>` (default:
that file to localhost). Unreal presumably receives it through Xsens' MVN Live Link plugin, which
StreamTwo's README links (unverified).

## Unreal and Unity plugins (UE4-era)

Most date from 2020-2021 for Unreal Engine 4.2x; expect to port them for UE5.

| Repo | What it does | Use |
|---|---|---|
| UE4-OSC (archived fork, MIT) | Send and receive OSC from Blueprints (oscpack) | Copy `OSC` into `<Project>/Plugins/OSC`; set ports in Project Settings, Plugins, OSC. Unreal now ships its own OSC plugin (the last commit fixes a clash with it): prefer that |
| RuntimeAudioImporter (fork, MIT) | Import MP3, WAV, FLAC at runtime (dr_libs) | Into `Plugins/`; tags 4.24.0-4.26.0 match UE versions; docs unreal.blog/runtime-audio-importer. Get current versions from the author, Georgy Treshchev ("Respirant") |
| RuntimeFilesDownloader (fork, MIT) | Download files over HTTP at runtime | Same author and pattern; docs unreal.blog/runtime-files-downloader |
| UnrealZeroMQ (fork, no licence file) | ZeroMQ (cppzmq) for UE4 on Windows, Linux, macOS | Copy into `Plugins/`, add `"ZeroMQ"` to `PublicDependencyModuleNames`, `#include <zmq.hpp>`. Check the upstream author's licence before shipping |
| EventCenterPlugin (WIP) | Pub/sub events into Unreal over WebSockets | Python venv + `pip install -r requirements.txt` for its server; needs the paid BlueprintWebSocket plugin; set `UnfocusedVolumeMultiplier=1.0` |
| ActorSpawningPlugin | Stub ("spawn all kinds of content in-engine") | Nothing to use |
| Azure-Kinect-Sample-for-Unity (fork, MIT) | Point cloud and textured-mesh demos for Unity 2019.4 | Install Azure Kinect SDK 1.4.1, copy its DLLs from `C:\Program Files\Azure Kinect SDK v1.4.1\sdk\windows-desktop\amd64\release\bin` into the sample's `Plugins` folder, open `PointCloud.unity` or `TextureMesh.unity` |

Unreal projects such as HyperJail, AnimationTest and StreamTwo are project dumps, not plugins; see
`../../craft-apps/references/catalog.md` for those and the remaining legacy repos.
