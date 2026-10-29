# ArtCraft Studio, ArtCraft-X and the Craft AI layer

Sources: `storytold/artcraft` (README, AGENTS.md, `_docs/`, `docs/`, workflows, NOTICE),
`artcraft-services` (API routes, website source, LICENSE.md), `artcraftx`, `craft-ai-integrations`,
and read-only checks of the public API on 2026-10-29. "(unverified)" marks anything beyond those.

## What ArtCraft is

ArtCraft Studio (`storytold/artcraft`, ~37k stars, "The IDE for artists") is a desktop studio for
AI image and video work: compose in 2D, stage scenes in 3D, then generate with the model you pick.
It is a Tauri 2 app (Rust backend, React/TypeScript/Three.js frontend). Unlike the free Crafting
Apps, it sells generation credits. Its backend is `storyteller-web` (repo `artcraft-services`) at
`https://api.storyteller.ai`; the same team runs FakeYou (CDN `cdn-2.fakeyou.com`), and macOS
builds are signed by "Learning Machines LLC".

| Front end | What it is | Where |
|---|---|---|
| Desktop (Tauri) | Everything below | Windows and macOS releases; Linux from source |
| `artcraft-native` | Pure-Rust egui rewrite in the same repo. Create Image/Video/Audio done; other tools say "coming soon" | Source only |
| Web app | `app.getartcraft.com`, same account and library | Browser |

## Features (README, FAQ and the app's pages)

| Feature | What it does |
|---|---|
| Text to image, prompted editing | Prompt any image model; edit by description (Nano Banana Pro, GPT Image) |
| 2D Canvas | Sketch, lay out references, mask, inpaint; layers, background removal, drawing |
| 3D Editor | Place subjects and cameras, set camera height and focal length, kitbash 3D asset kits to block a shot, layer backdrops/props in depth |
| Character posing, identity transfer | Pose a mannequin and camera; the mannequin guides pose and placement of your character; `@Character` references |
| Image to location / 3D world | World Labs Marble Gaussian-splat worlds; several shots in one consistent room |
| Image to 3D mesh | Hunyuan 3D, Tripo3D, Meshy, Rodin; position and frame the object |
| Image to video | Start/end keyframes, reference images/video/audio where the model allows |
| Music and sound | Suno (music, remix, sounds, samples), Seed Audio |
| Other pages | Angles (re-angle a shot), Storyboard, Moodboard, Background change, Video editor, Frame extractor, image/video watermark removers (only for media the user has rights to) |

## Models, providers, accounts

- **ArtCraft-hosted models, paid in credits.** Live list, no sign-in:
  `GET https://api.storyteller.ai/v1/omni_gen/models/{image|video|audio|mesh|splat}` (entries with
  `is_disabled` are off). On 2026-10-29: images FLUX.1/1.1, Nano Banana/2/Pro, GPT Image 1-2.5,
  Seedream 4-5, Midjourney 7/8; video Seedance 1.0-2.5, Kling 1.6-3.0, Veo 2-3.1, Vidu Q3, MiniMax
  H3, Sora 2, Grok Imagine, Flux 3, Wan 3.0, Happy Horse 1.0; audio Suno, Seed Audio 1.0; meshes
  Hunyuan 3D 2.0-3.1, Tripo3D H3.1, Meshy 6, Rodin 2.5 Fast; splats Marble 1.0/1.1, TripoSplat.
  The README's "62-model catalog" is a narrower snapshot; the live list and the cost endpoint
  (which prices even Midjourney 7 and Grok Imagine in credits) are authoritative.
- **The user's own accounts (desktop).** Grok (Imagine, Video), Midjourney, Sora (Sora 1/2, GPT
  Image 1) and World Labs (Marble): the user signs in inside ArtCraft's login window and ArtCraft
  keeps that session (cookies or bearer token) in `~/Artcraft/credentials`, shared by both desktop
  front ends. fal takes the user's own fal API key (image jobs). The pricing page: "You can bring
  your own compute and third-party subscriptions." Planned: Kling, Google, Runway, Luma, and
  aggregator subscriptions (OpenArt, Freepik).
- **Caveat.** The Grok/Midjourney/Sora/World Labs routes drive consumer web accounts (the code has
  browser-emulation and Cloudflare-mitigation crates). They break when a site changes, and the
  user should check that provider's terms before relying on them.
- **ArtCraft account.** Free sign-up. The desktop signs in by website approval (code or QR) or
  username/password; the session cookie lives in the native cookie jar and OS credential manager,
  never in JavaScript. `~/Artcraft/settings/env_configs.json` picks the API host
  (`{"storyteller_host":"production"}` by default; `localhost` + port 12345 for a local backend).

## Costs

The app is free. Plans (getartcraft.com pricing source, October 2026; prices change): Basic
$10/month for 1,000 credits, Pro $35 for 3,750, Max $60 for 6,600; yearly $96 / $336 / $576.
One credit is about one US cent at list: the cost API returns `cost_in_usd_cents` equal to the
credits. Checked 2026-10-29: Seedance 2.0 at 720p for 5 s = 93 credits; one square Nano Banana Pro
image = 15 credits. The pricing page promises refunds for failed generations. Quote the cost
before spending (no sign-in; same body as generation; also `image`, `audio`, `mesh`, `splat`):

```bash
curl -s -X POST https://api.storyteller.ai/v1/omni_gen/cost/video -H 'Content-Type: application/json' \
  -d '{"model":"seedance_2p0","duration_seconds":5,"resolution":"seven_twenty_p","aspect_ratio":"wide_sixteen_by_nine"}'
# {"success":true,"cost_in_credits":93,"cost_in_usd_cents":93,"is_free":false,...}
```

## Install

| OS | Get it | Notes |
|---|---|---|
| Windows 10/11 x64 | getartcraft.com/download: `ArtCraft_<ver>_x64-setup.exe` (NSIS) | 8 GB RAM, 2 GB disk recommended |
| macOS 12+ | `ArtCraft_<ver>_universal.dmg` (Apple silicon and Intel) | Developer ID signed; notarized (unverified) |
| Linux | Build from source | The CI Linux job is commented out; v0.41.0 has no Linux asset |
| Any | `app.getartcraft.com` | Web app |

Both files are GitHub release assets:
`https://github.com/storytold/artcraft/releases/download/artcraft-v<ver>/ArtCraft_<ver>_x64-setup.exe`
(and `..._universal.dmg`). The site pointed at 0.41.0 on 2026-10-29 (main is 0.42.0). Releases
are drafts built on pushes to `release`/`artcraft-release`; they carry no `SHA256SUMS.txt` and the
app has no updater plugin, so updating means installing the newer build. ArtCraft Launcher does
not install ArtCraft Studio (it handles the Crafting Apps only).

Build from source (macOS or Linux):

```bash
# Rust stable, Node.js 20+ (24.13 tested), npm, Tauri CLI 2 and Tauri's OS prerequisites
cargo install tauri-cli --version "^2" --locked
git clone --depth 1 https://github.com/storytold/artcraft && cd artcraft
./script/artcraft/unix_dev.sh     # dev: Vite on 127.0.0.1:5193+ (ARTCRAFT_DEV_PORT) plus the window
./script/artcraft/unix_build.sh   # release bundle through `cargo tauri build`
```

- Windows: `.\script\artcraft\windows_build.ps1` (installer lands in `target\release\bundle\nsis`).
  The `wreq` HTTP crate needs `choco install cmake strawberryperl pkgconfiglite llvm nasm`
  (macOS: `brew install cmake pkg-config llvm`; Linux equivalents unverified).
- Linux: Tauri needs `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf` (from the
  CI file). The dev launcher sets `WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1`.
- The scripts set `SQLX_OFFLINE=true`, so no database is needed to compile.
- Lighter: `cargo run -p artcraft_native --release` (egui, no Node or Tauri CLI; FFmpeg on `PATH`
  for in-app video playback; the Midjourney sign-in window uses a `wry` webview).

## Can Claude drive it?

**The desktop app: no.** It is GUI-only: no CLI, no MCP server, no `--control` port (unlike the
Crafting Apps), no deep links; every action is a Tauri IPC call from its own webview.
`artcraft-native` reads `ARTCRAFT_SCREENSHOT=<file.png>`, `ARTCRAFT_PAGE=home|create-image|
create-video|create-audio|library`, `ARTCRAFT_OPEN=settings|midjourney-login` and
`ARTCRAFT_SCREENSHOT_EXIT=1`, which only take a screenshot of a page.

**Headless routes (all hit the hosted service and spend the user's credits):**

| Route | Auth | Covers | Status |
|---|---|---|---|
| Omni API `/v1/omni_api/*` | API key | Image and video generation, uploads (image/video/audio), job status | Live, documented; the route to use |
| Omni Gen `/v1/omni_gen/*` | Session cookie; none for `models`/`cost` | Image, video, audio, mesh, splat | The apps' own endpoints; use `models` and `cost` only |
| MCP sessions `/v1/mcp/session/{create,refresh,revoke,list}` | API key or web session, then an `mcp_session_...` credential | Generation endpoints accept that credential | Routes live since 2026-08, but no MCP server is published in the org and nothing answers at `api.storyteller.ai/mcp`. Do not promise an ArtCraft MCP |
| `craft-ai-artcraft` (Rust crate) | API key | Prompt-only `nano_banana` image, `seedance_2p0` video | For Crafting App developers; not tested against the live service |

### Omni API recipe

1. Key: app.getartcraft.com, Settings, API Keys (`artcraft_api_` + 40 characters, shown once).
   The guide says staff enable API access per account; if the tab or key creation fails, ask on
   Discord. The user keeps it in an environment variable (`ARTCRAFT_API_KEY` is this plugin's
   name, not an official one); never print it or write it to files.
2. Submit (`Authorization: Bearer <key>`, no cookies; fresh UUID `idempotency_token` every time):

```bash
curl -s -X POST https://api.storyteller.ai/v1/omni_api/generate/video \
  -H "Authorization: Bearer $ARTCRAFT_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"seedance_2p0","prompt":"...","duration_seconds":5,"aspect_ratio":"wide_sixteen_by_nine",
       "resolution":"seven_twenty_p","idempotency_token":"'"$(uuidgen)"'",
       "start_frame_image_url":"https://example.com/first-frame.png"}'
# {"success":true,"inference_job_token":"jinf_...","all_job_tokens":["jinf_..."]}
```

   Video inputs: `start_frame_image_url`, `end_frame_image_url`, `reference_image_urls`,
   `reference_video_urls` (mp4 only), `reference_audio_urls`, or the matching `*_media_token(s)`
   from `/v1/omni_api/upload/{image,video,audio}` (one form per field, not both); also
   `negative_prompt`, `generate_audio`, `video_batch_count`. Images: `POST
   /v1/omni_api/generate/image` with `model`, `prompt`, `aspect_ratio`, `resolution`, `quality`,
   `image_batch_count`, `image_urls`; the angle models also take `adjust_horizontal_angle`,
   `adjust_vertical_angle`, `adjust_zoom`. Audio, mesh and splat have no API-key route.
3. Poll `GET /v1/omni_api/job_status/job/<token>` (or `/batch?tokens=a&tokens=b`) every ~5 s while
   `state.status.status` is `pending`, `started` or `attempt_failed`. On `complete_success` download
   `state.maybe_result.media_links.cdn_url`; stop on `complete_failure`, `dead`,
   `cancelled_by_user` or `cancelled_by_system`. The guide's example video took about 11 minutes.
4. Errors: 401 bad or banned key, 402 not enough credits, 400 bad input (URLs must be http(s) and
   reachable; type is read from the bytes; 10 redirects at most). Reusing a token is rejected.

Input URLs are downloaded and stored as media files on the user's account; results also land in
their library. Result links are plain CDN URLs (who else can open them: unverified). Full
reference: Swagger UI at https://storyteller-docs.netlify.app/ (spec `api.json`; model enums
`CommonImageModel` and `CommonVideoModel`).

## How Claude helps when the work needs the window

3D staging, posing, kitbash blocking, masked inpainting, Angles and world building only exist in
the GUI. Claude's part:

1. Plan: shot list; per shot the model id, aspect ratio, resolution, duration, references and a
   prompt within the model's `text_prompt_max_length`; total credits from the cost endpoint.
2. Prepare inputs with the Crafting Apps (craft-image, craft-design): reference boards, plates,
   character turnarounds, blocking diagrams, frames at exact pixel sizes.
3. Write click-level steps: 3D Editor (+ preset or imported images, place the subject, camera
   height and focal length, short style prompt, generate, compare); 2D Canvas (high-contrast
   sketch, mask small areas, short prompt, inpaint details).
4. With an API key and the user's go-ahead on spend: run Omni API jobs, save results into the
   project, keep a manifest (prompt, model, job token, credits, result URL).
5. Finish with craft-av (FilmCraft edit and titles, EffectCraft motion graphics, SoundCraft voice
   and music) and craft-image (PhotoCraft stills, LightCraft grading and export).
6. With desktop-control tools and the user's request, operating the app is possible but slow and
   fragile; prefer the API.

## ArtCraft-X (`storytold/artcraftx`)

"A minimal desktop app for AI creation" (images, video, audio, 3D meshes, worlds): Tauri 2 +
React, pared down from ArtCraft, with provider clients for ArtCraft, fal, GMI Cloud, Grok,
Higgsfield, Midjourney and "seedance2pro" and a local-file index. README: "Early Experimental
Release. Builds are Forthcoming." No releases, tags or licence file. Developers only:
`./script/unix_dev.sh` (Node 20+, npm, Rust, Tauri 2 CLI; Vite from port 5183,
`ARTCRAFTX_DEV_PORT`). Don't point users at it.

## craft-ai-integrations: the shared AI layer for the Crafting Apps

Goal: a person connects an AI tool and model once (in the launcher or any app) and every Craft app
with that tool uses it. Rust workspace, pre-1.0, MIT OR Apache-2.0; library crates, no CLI.

| Part | What it holds |
|---|---|
| `craft-ai-core` | Data model and provider trait (wasm-safe). The contract also lives in craft-libs; this repo keeps a newer local copy |
| `craft-ai-native`, `craft-ai-client` | Secret stores, shared store, consent and history files; `AiClient`, `ToolDesk`, `ConnectionManager` |
| Hosted adapters | OpenAI-compatible (text; images generate/edit/inpaint), BFL FLUX, Vertex express-mode Gemini images, BytePlus ModelArk Seedance (the China address is refused), ArtCraft Omni API key, declarative (a provider described by a data file) |
| Local | `craft-ai-comfyui` (ComfyUI workflows; inpaint needs mapped `LoadImage` and `LoadImageMask`; nodes checked via `/object_info`; imported `image.segment` graphs return checked masks), `craft-ai-comfy-env` (finds ComfyUI Desktop, inventories models and node packs, downloads missing files), `craft-ai-sam3` (SAM 3 point/session clients), engines SAM 2.1 on rten (CPU default), SAM 2.1 on Burn (optional GPU), SAM 3 on Candle |
| `craft-ai-egui` | Theme-neutral widgets: status, model picker, consent prompt, job progress, connection panel, history (egui 0.37 via the pinned storytold egui/winit forks; Rust 1.95) |

- **Keys.** OS keychain plus environment by default; a passphrase-encrypted file store exists
  but is not in `ConnectionManager::standard()`, so a bare Linux session without a keychain cannot
  save a key until an app supplies a passphrase. Headless runs read `CRAFT_AI_SECRET_<REF>` (ref
  upper-cased, other characters `_`: `conn_01/key` becomes `CRAFT_AI_SECRET_CONN_01_KEY`).
- **Files** (a proposal still being settled with the launcher): `%LOCALAPPDATA%\ArtCraft\ai`,
  `~/Library/Application Support/ArtCraft/ai`, `$XDG_CONFIG_HOME/ArtCraft/ai` (default
  `~/.config/ArtCraft/ai`); override `CRAFT_AI_DIR`. Inside: `connections.json`, `secrets.enc.json`,
  `jobs.jsonl`, `catalog.json` (empty: no "Recommended" models yet), `workflows/`.
- **Consent** is scoped to app, connection, destination, capability and kind of data, may expire,
  and is checked before the key is read; a tool whose adapter is missing is refused at `plan`.
- **TLS** uses the platform certificate store, so an intercepting proxy or antivirus can read
  traffic, keys included.
- **Status (docs/STATUS.md).** Every hosted adapter is tested only against scripted local servers;
  no real hosted provider is verified. Run for real: SAM 3 through a headless ComfyUI, SAM 2.1 on
  rten and Burn, all on one Windows machine. No app runs a tool through the shared binding yet
  (PhotoCraft's dev build calls the SAM 3 clients directly), and the launcher's main branch has no
  "Set up AI" window yet.
- **When Claude uses it:** only for developers wiring AI into a Craft app (start at
  `docs/ADOPT-A-TOOL.md`; `cargo run -p craft-ai-client --example custom_tool`;
  `tools/intake/propose.py` for proposals) or to explain where keys and consent live. Its rules:
  targeted `cargo -p` builds, and no live or paid calls, downloads or merges without permission.

## Licences and fine print

- `artcraft`: MIT OR Apache-2.0. The ArtCraft name, wordmark and logos are trademarks outside the
  licence. NOTICE lists bundled files with no licence granted (Nintendo game sound effects, meme
  images, skybox textures, an MMD motion, Mixamo renders) "to be phased out"; don't redistribute
  builds or assets on the assumption that everything is MIT.
- `artcraft-services` (backend, web app, website) is under "ArtCraft License (WIP)", a
  fair-source, non-OSI text: free private use; no selling it, no competing product, no stripping
  community, donation or paid-model links, no use of the name or mascots. It says generated
  assets belong to the user; the underlying model providers' own terms may also apply (unverified).
- `artcraftx`: no licence file. `craft-ai-integrations`: MIT OR Apache-2.0; SAM 3 on Candle is
  Apache-2.0 only (see its NOTICE).
- Likeness: the FAQ shows how to make photos and videos "of yourself"; for any real person, get
  their consent, and label AI media where it is published.

## Links

getartcraft.com (`/download`, `/pricing`, `/faq`, `/tutorials`, `/apps`) · app.getartcraft.com ·
api.storyteller.ai · storyteller-docs.netlify.app · github.com/storytold/artcraft/releases ·
Discord discord.gg/artcraft · YouTube @OfficialArtCraftStudios · X @get_artcraft.
