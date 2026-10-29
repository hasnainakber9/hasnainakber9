# The storytold org: all 69 repositories

Snapshot of github.com/storytold on 2026-10-29: the org listing, the last commit on each default
branch, release tags, and the launcher's release feed. Status: **active** = commits in the last 30
days; **maintained** = commits within a year; **legacy** = older, superseded or abandoned;
**archived** = archived on GitHub; **empty** = no content; **fork** = a copy of another project
(judged by commit history; GitHub's fork flag was only seen for egui and winit); **infra** = CI,
services, assets or websites rather than something a user runs. Versions are the latest
published release.

| # | Repo | What it is | Status | Plugin fit |
|---|---|---|---|---|
| 1 | photocraft | Image editor (Photoshop-style): layers, masks, filters, type, PSD; v0.17.0 | active | craft-image |
| 2 | lightcraft | Photo library and raw development (Lightroom-style); v0.15.0 | active | craft-image |
| 3 | vectorcraft | Vector illustration (Illustrator-style); v0.18.0 | active | craft-design |
| 4 | figcraft | Interface design and prototyping (Figma-style), plus a `figcraft-server` Linux build; v0.12.1, missing from the launcher feed on 2026-10-29 | active | craft-design |
| 5 | designcraft | Page layout and publishing (InDesign-style); v0.14.0 | active | craft-design |
| 6 | effectcraft | Motion graphics and visual effects (After Effects-style), Lottie; v0.18.0 | active | craft-av |
| 7 | filmcraft | Video editing, colour and sound (Premiere-style); v0.14.0 | active | craft-av |
| 8 | soundcraft | Audio recording, editing and mixing (DAW); v0.14.0 | active | craft-av |
| 9 | cadcraft | 2D CAD, DWG and DXF (AutoCAD-style); v0.14.0 | active | craft-cad |
| 10 | wordcraft | Word processing and documents; v0.12.0 | active | craft-office |
| 11 | gridcraft | Spreadsheets and data; v0.13.0 | active | craft-office |
| 12 | deckcraft | Presentations and slide decks; v0.12.0 | active | craft-office |
| 13 | pdfcraft | Reading, organising and protecting PDFs, plus a standalone `pdfcraft-cli` Linux tarball; v0.15.0 | active | craft-office |
| 14 | indd-utils | `indd` CLI: reads InDesign INDD/INDT without InDesign and converts to IDML (clean-room); build from source, no releases | active | craft-design |
| 15 | photocraft-corpus | 258 Photoshop-made PSDs (plus GIMP XCFs) that store their own rendering: test oracles for PhotoCraft | active | not user-facing |
| 16 | artcraft | ArtCraft Studio: AI image and video studio (Tauri desktop, egui `artcraft-native`), 2D canvas, 3D staging, posing, many hosted models; v0.41.0 for Windows and macOS; ~37k stars | active | craft-ai |
| 17 | artcraft-services | ArtCraft backend `storyteller-web` (api.storyteller.ai: Omni API, credits, Stripe, launcher feed), web app app.getartcraft.com, website getartcraft.com; "ArtCraft License (WIP)" | active, infra | craft-ai (API facts only) |
| 18 | artcraftx | ArtCraft-X, a minimal Tauri AI creation app; "Builds are Forthcoming"; no licence file | active, experimental | craft-ai (mention only) |
| 19 | craft-ai-integrations | Shared AI layer for the Craft apps: provider adapters, keys, consent, ComfyUI and SAM engines, egui widgets; Rust library, pre-1.0 | active | craft-ai (developers) |
| 20 | cloud-worker | MiniMax H3 open-weights video on RunPod through ComfyUI: install scripts, workflows, benchmarks, serving plan | maintained (2026-08) | craft-ai (research-repos.md) |
| 21 | craft-launcher | ArtCraft Launcher: installs, updates and opens the Crafting Apps (egui desktop and web); v0.9.0, early alpha | active | craft-apps hub |
| 22 | craft-launcher-assets | Screenshots the launcher downloads at run time (pinned tag `v1`) | active, infra | not user-facing |
| 23 | craft-libs | Shared Rust crates: craft-ai-core, craft-pdf, craft-cms, fonts, i18n, settings, dialogs, print, media containers | active | not user-facing (developers) |
| 24 | craft-fonts | Font files and manifests (CJK, Arabic, Thai, Hebrew, Devanagari, symbols; opt-in Latin set), an optional build input | active | craft-apps hub (source builds) |
| 25 | craft-i18n | Shared translation catalogs (TSV keyed by English), an optional build input | active | craft-apps hub (translators) |
| 26 | craft-common-actions | Reusable GitHub workflows: multi-platform release, packaging lint, FreeBSD, Windows ARM64, Nix, SonarCloud, supply chain; tag `v1` | active, infra | craft-apps hub (release layout) |
| 27 | craft-contrib | Contributor and coding-agent guidelines; changes by RFC | active | not user-facing |
| 28 | craft-repo-status-app | "Craft Status", a macOS tray dashboard of the craft repos (urgent issues, PRs, releases, downloads); Tauri | active, internal | not user-facing |
| 29 | font-preview-service | Rust web service scaffold (only `GET /healthz`); Docker image with Google Fonts and Noto | active, scaffold | not user-facing |
| 30 | egui | Fork of emilk/egui; every Craft app pins it (rev `6d518fc`, egui 0.37) through `[patch.crates-io]` | fork, active | not user-facing |
| 31 | winit | Fork of rust-windowing/winit pinned by the Craft apps, the launcher and craft-libs | fork, active | not user-facing |
| 32 | winprint.rs | Fork of ArcticLampyrid/winprint.rs (Windows printing, BSD-3-Clause) with a storytold GDI transport patch; used by craft-libs `craft-print` | fork, active | not user-facing |
| 33 | github-media | Images and videos used in READMEs | maintained, infra | not user-facing |
| 34 | crafthub | One commit, README "Placeholder for merges" | empty | not user-facing |
| 35 | placeholder-artcraft | 2025 stand-in copy of allowlisted ArtCraft directories while secrets were purged; superseded by artcraft | legacy | not user-facing |
| 36 | AniCraft | No commits at all | empty | not user-facing |
| 37 | spark | Fork of World Labs' Spark, a 3D Gaussian Splatting renderer for THREE.js (MIT) | fork, idle since 2025-11 | craft-ai (research-repos.md) |
| 38 | FineTrainers-Conditioning | Fork of finetrainers (video-model LoRA and fine-tuning) with WIP conditioning branches; Apache-2.0 | fork, legacy (2025-02) | craft-ai (research) |
| 39 | storyteller-ml | Storyteller ML monorepo: TTS, voice conversion, animation, TripoSR, stem separation, ComfyUI (vendored third-party code) | legacy (2025-02) | craft-ai (research) |
| 40 | vits-finetuning | VITS text-to-speech fine-tuning that fits Colab GPUs, TorchScript export; MIT; all commits by one external author | legacy (2023) | craft-ai (research) |
| 41 | torchscript-models | Notes and harnesses for exporting glow-tts, HiFi-GAN and MelGAN to TorchScript | legacy (2020) | craft-ai (research) |
| 42 | fakeyou-recast | Rust desktop app for real-time voice conversion (SoftVC + HiFi-GAN on libtorch/CUDA) | legacy (2023) | craft-ai (research) |
| 43 | realtime-voice-conversion | Rust audio I/O with a Python CycleGAN-VC sidecar over ZeroMQ | archived (2020) | craft-ai (research) |
| 44 | LiveScan3D | Fork of Marek Kowalski's real-time 3D capture from several Kinect sensors (MIT, Windows) | fork, legacy (2020) | craft-ai (research) |
| 45 | cloudcam | Rust server that streams Azure Kinect point clouds over ZeroMQ to Unreal (WIP) | legacy (2022) | craft-ai (research) |
| 46 | CloudCamPlugin | Unreal plugin: CloudCam actors, ZeroMQ poller, Niagara point rendering | legacy (2022) | craft-ai (research) |
| 47 | point-generator | Rust: synthetic points over ZeroMQ for the Unreal point-cloud demo | legacy (2021) | craft-ai (research) |
| 48 | k4a-sys-temp | Patched fork of k4a-sys (Azure Kinect SDK 1.3 bindings); README: "Do not use." | fork, legacy (2021) | craft-ai (research) |
| 49 | bevy-mocap | ARKit facial capture driving Bevy shape keys and bones (Bevy 0.12) | legacy (2024) | craft-ai (research) |
| 50 | xsens-packet-send | Rust: replays recorded Xsens MVN packets (.pcap) to Unreal | legacy (2022) | craft-ai (research) |
| 51 | motion-capture-data | Xsens MVN session recordings (.mvn, .mvns) | legacy (2022) | craft-ai (research) |
| 52 | UE4-OSC | Fork of an OSC plugin for Unreal Engine 4 (MIT) | archived, fork | craft-ai (research) |
| 53 | RuntimeAudioImporter | Fork of an Unreal plugin that imports MP3/WAV/FLAC at runtime (MIT) | fork, legacy (2021) | craft-ai (research) |
| 54 | RuntimeFilesDownloader | Fork of an Unreal plugin that downloads files over HTTP at runtime (MIT) | fork, legacy (2021) | craft-ai (research) |
| 55 | UnrealZeroMQ | Fork of a ZeroMQ plugin for Unreal Engine 4 with build fixes; no licence file | fork, legacy (2021) | craft-ai (research) |
| 56 | EventCenterPlugin | WIP Unreal plugin: WebSocket pub/sub events (needs the paid BlueprintWebSocket plugin) | legacy (2021) | craft-ai (research) |
| 57 | ActorSpawningPlugin | Unreal plugin stub ("spawn all kinds of content in-engine") | legacy (2021) | not user-facing |
| 58 | Azure-Kinect-Sample-for-Unity | Fork of a Unity 2019.4 point-cloud and mesh sample for Azure Kinect (MIT) | fork, legacy (2020) | craft-ai (research) |
| 59 | storyteller-bevy | "Storyteller Studio": a Bevy app compiled to WebAssembly in an Nx monorepo | legacy (2024) | not user-facing |
| 60 | HyperJail | UE5 VTubing experiment (an Unreal project) | legacy (2023) | not user-facing |
| 61 | AnimationTest | UE5 project ("UE5 VTuber show HyperJail") | legacy (2022) | not user-facing |
| 62 | StreamTwo | Unreal project for a Twitch stream; bundles Legend of Zelda maps and assets | legacy (2022) | not user-facing |
| 63 | hanashi-graphics-demo | WebAssembly graphics demo page, no README | legacy (2023) | not user-facing |
| 64 | html_test | FakeYou HTML test pages, no README | legacy (2023) | not user-facing |
| 65 | discord-vocodes | Discord bot for the vo.codes TTS service (Rust) | legacy (2020) | not user-facing |
| 66 | voder-proxy | Load balancer for vo.codes TTS requests (Rust) | archived (2020) | not user-facing |
| 67 | redirect-vocodes | Netlify redirects from vo.codes to fakeyou.com | legacy (2022), infra | not user-facing |
| 68 | irsa-manager | Fork of kkb0318/irsa-manager: IAM roles for Kubernetes service accounts (Go, MIT) | fork, infra (2024) | not user-facing |
| 69 | terraform-aws-observability-accelerator | Fork of AWS's Terraform observability modules (Prometheus, Grafana, ADOT; Apache-2.0) | fork, infra (2023) | not user-facing |

The domain skills hold the per-app references; `../../craft-ai/references/artcraft.md` and
`../../craft-ai/references/research-repos.md` cover rows 16-20 and 37-58.

## Shared pieces

### ArtCraft Launcher (`craft-launcher`)

A small native egui app (no CLI) that lists the Craft App Suite (the 13 apps plus the community
app SolidCraft by Tangency Labs), installs the right build for the OS and CPU after checking the
release's SHA-256, updates apps and itself ("Update and restart"), and opens them from a window or
the tray. It does not install ArtCraft Studio. For the headless CLIs use `craft.py` instead.

Install it on a desktop from github.com/storytold/craft-launcher/releases/latest (`<ver>` e.g. 0.9.0):

| OS | File | Notes |
|---|---|---|
| Windows 10/11 | `artcraft-launcher-<ver>-windows-{x64,arm64,x86}.msi`, or `...-portable.zip` | MSI is per-user, no admin rights |
| macOS 11+ | `artcraft-launcher-<ver>-macos-universal.dmg` | Signed and notarized; drag to Applications |
| Linux x86_64/aarch64 (glibc 2.35+) | `.AppImage` (`chmod +x`), `.deb` (`sudo apt install ./...deb`), `.rpm` (`sudo dnf install ./...rpm`), `.flatpak` (`flatpak install --user ...`), `.tar.gz` | riscv64: deb, rpm, tar.gz. GNOME needs the AppIndicator extension for the tray |
| FreeBSD 14 x86_64 | `artcraft-launcher-<ver>-freebsd-x86_64.tar.gz` | Unpack into `/usr/local` after `pkg install` of the listed libraries |
| Source | `cargo run --release -p artcraft-launcher` | Rust 1.90+; or `nix run github:storytold/craft-launcher` |

- Apps it installs land where the system keeps applications: `/Applications/<App>.app` (from the
  signed DMG), `C:\Program Files\ArtCraft\<App>` through the MSI (Windows asks for admin on each new
  install), `.deb`/`.rpm` on Linux (password prompt) or else a Flatpak or an AppImage in
  `~/Applications`, `/usr/local` on FreeBSD. It also adopts apps the user installed by hand.
- It reads one public feed, `GET https://api.storyteller.ai/v1/craft_apps/release_info` (each app's
  latest tag, notes, and every asset with its download URL and `sha256`), and downloads only from
  `github.com/storytold/<app>/releases` plus the approved community app.
- Log: `logs/artcraft-launcher.log` under `~/.local/share/artcraft-launcher`,
  `~/Library/Application Support/ArtCraft Launcher` or `%LOCALAPPDATA%\ArtCraft Launcher`; set
  `RUST_LOG=debug` for more. `ARTCRAFT_LAUNCHER_LOCALE=pt-BR` tries a language.
- Developers can serve their own builds: `cargo xtask local sync`, `cargo xtask local serve`, then
  run a `local-mirror` build with `ARTCRAFT_LAUNCHER_DOWNLOAD_BASE=http://127.0.0.1:8787/`.

### craft-libs

Rust workspace (edition 2024, Rust 1.95) of crates named `craft-<name>`; apps pull them as git
dependencies pinned by `rev` (no tags). Notable: `craft-ai-core` (AI contract), `craft-pdf`,
`craft-cms` (ICC colour management), `craft-font-catalog`/`-manager`/`-store`, `craft-fonts-build`,
`craft-i18n`, `craft-settings` (`config.toml`, portable mode), `craft-dialogs`, `craft-print`
(CUPS and Windows), `craft-media` (MP4/MOV/Matroska containers), `craft-keymap`, `craft-ui`.
Users meet it only in source builds, which fetch it from github.com/storytold.

### craft-fonts

Fonts belong here, not in app repos. `fonts/manifest.txt` lists the default faces (BIZ UDPGothic,
Shippori Mincho, BIZ UDMincho, Noto Sans CJK SC, NanumGothic, Noto Sans Arabic/Thai/Georgian/
Hebrew/Devanagari/Symbols); opt-in manifests add 16 Latin families (51 faces, about 19.5 MiB) and a
native-only Simplified Chinese face. It is a build-time input, never a Cargo dependency: set
`CRAFT_FONTS_DIR` to an **absolute** path of a checkout and the app's `build.rs` embeds the faces;
`CRAFT_FONTS_REQUIRED=1` turns a missing checkout into a build error. Release builds always set
both; a plain source build without it still builds and runs, just without those embedded faces.

```bash
git clone --depth 1 https://github.com/storytold/craft-fonts ~/src/craft-fonts
CRAFT_FONTS_DIR=$HOME/src/craft-fonts cargo build --release --locked -p <app>-cli
```

Code is MIT OR Apache-2.0; every font is OFL-1.1.

### craft-i18n

Shared translations: `locales/<locale>/common.tsv` and `<app>.tsv`, one `context<TAB>English<TAB>
translation` row each. Same optional-input pattern as craft-fonts: `CRAFT_I18N_DIR=<absolute
path>` embeds the catalogs; without it the app is English-only. An app pins its commit in
`craft-i18n.rev`; release builds then check out that SHA and set `CRAFT_I18N_REQUIRED=1`, which
fails only on a missing or broken checkout, never on missing translations. Lookup code (fallback
`pt-br` to `pt` to English, plurals) is the `craft-i18n` crate in craft-libs. To help translate:
edit the TSV in a pull request (`tools/new_locale.py <code> "<Name>" <apps>` starts a language),
translate from the English meaning only (clean-room rule), and credit yourself in ATTRIBUTION.md,
saying whether AI tools were used.

### craft-common-actions: the release layout, checked

Checked against `.github/workflows/release.yml` and `actions/draft-release/action.yml` (last
change 2026-10-28) and the published files of PhotoCraft v0.17.0, PdfCraft v0.15.0 and FigCraft
v0.12.1. An app's `release` branch push builds macOS universal, Windows x64/x86/arm64, Linux
x86_64/aarch64 (AppImage, deb, rpm, tar.gz), Flatpak, Arch, FreeBSD, web, Linux riscv64 and an
optional server build, then creates a **draft** release tagged `v<ver>`, titled `<App> v<ver>`,
with `SHA256SUMS.txt` covering every file (`sha256sum *`). Signing secrets are mandatory on the
release branch (macOS Developer ID plus notarization; Windows Azure Trusted Signing). Builds embed
craft-fonts (pinned) and craft-i18n (when `craft-i18n.rev` exists).

File names come from each app's own `packaging/` scripts; release.yml only insists on exactly one
app tarball `*-<ver>-linux-<arch>.tar.gz` beside any `-cli-` or `-server-` tarballs.

| Platform | File | Where the CLI is (checked in real archives) |
|---|---|---|
| Linux x86_64, aarch64, riscv64 | `<app>-<ver>-linux-<arch>.tar.gz` | `<app>-<ver>-linux-<arch>/bin/<app>-cli` (top folder, then an FHS tree) |
| Linux, PdfCraft only | `pdfcraft-cli-<ver>-linux-<arch>.tar.gz` | `pdfcraft-cli-<ver>-linux-<arch>/pdfcraft-cli` |
| Linux, FigCraft | `figcraft-server-<ver>-linux-<arch>.tar.gz` | A server build; its packaging ships `figcraft-cli` in the main tarball only once that crate exists |
| macOS universal | `<app>-cli-<ver>-macos-universal.zip` | `<app>-cli-<ver>-macos-universal/<app>-cli`; signed, notarized but not stapled. The app is `<app>-<ver>-macos-universal.dmg` |
| Windows x64, x86, arm64 | `<app>-<ver>-windows-<arch>-portable.zip` | `<app>-<ver>-windows-<arch>-portable/<app>-cli.exe` beside `<app>.exe`; the `.msi` installs both |
| FreeBSD | `<app>-<ver>-freebsd-<arch>.tar.gz` | `.../bin/<app>-cli` (every app has its own FreeBSD script) |
| Also | `.AppImage` + `.zsync`, `.deb`, `.rpm`, `.flatpak`, `.pkg.tar.zst` (Arch), `<app>-web-<ver>.zip` | |

Differences from the usual summary: every archive has a top-level folder; FreeBSD aarch64 became
a default only on 2026-10-28, so current releases ship FreeBSD x86_64 only; the README's
attestation example (`PhotoCraft-1.2.3-macos-universal.zip`) does not match real names; the
optional supply-chain job (SBOM `sbom.cyclonedx.json`, `gh attestation verify <file> --owner
storytold`) runs only in apps that opt in. ArtCraft Studio does not use this pipeline: its tags are
`artcraft-v<ver>`, its files `ArtCraft_<ver>_x64-setup.exe` and `ArtCraft_<ver>_universal.dmg`,
with no `SHA256SUMS.txt`.

### getartcraft.com and the hosted services

- **getartcraft.com**: product site (Next.js, source in artcraft-services): `/download` (ArtCraft
  Studio for Windows and macOS, "Use on web"), `/apps` and `/apps/<app>` (Crafting Apps and the
  launcher), `/pricing`, `/faq`, `/tutorials`, `/news`, `/press-kit`, `/support`.
- **app.getartcraft.com**: ArtCraft web app, account settings and API keys.
- **api.storyteller.ai**: the API (and the launcher feed); reference at storyteller-docs.netlify.app.

### Discord and other channels

discord.gg/artcraft is the community and support channel: questions, bug reports (the launcher
README asks for the OS, the app and the launcher log), and API-access requests. Also YouTube
@OfficialArtCraftStudios, X @get_artcraft, LinkedIn `artcraft-ai`. Code issues go to each repo's
GitHub issues; craft-ai-integrations asks for private security reports through GitHub's Security tab.

## Things that surprise people

- **Empty or placeholder:** AniCraft (no commits), crafthub (one README line),
  placeholder-artcraft (a 2025 stand-in, replaced by the real artcraft repo).
- **Name mismatches:** repo `craft-launcher` ships `artcraft-launcher-*` files and is called ArtCraft
  Launcher; craft-common-actions' README is titled "artcraft-common-actions"; torchscript-models'
  README says "jit-models", redirect-vocodes' says "vocodes-redirect", storyteller-bevy's says
  "Storyteller Studio"; FineTrainers-Conditioning's README is upstream finetrainers (renamed from
  cogvideox-factory).
- **Forks:** 14 by history: egui and winit (pinned by every app), winprint.rs (patched, used by
  craft-libs' `craft-print`), spark,
  FineTrainers-Conditioning, LiveScan3D, Azure-Kinect-Sample-for-Unity, RuntimeAudioImporter,
  RuntimeFilesDownloader, UnrealZeroMQ, k4a-sys-temp, UE4-OSC, irsa-manager,
  terraform-aws-observability-accelerator (vits-finetuning looks like one too).
- **Licences differ:** artcraft is MIT OR Apache-2.0 but artcraft-services is the fair-source
  "ArtCraft License (WIP)"; artcraftx and most legacy repos have no licence file. ArtCraft's NOTICE
  and StreamTwo include third-party game assets (Nintendo sound effects, Zelda maps) that no
  licence covers.
- **Feed gap:** FigCraft v0.12.1 is released but absent from the launcher feed.
- **cloud-worker's README** names the team's own GPU pod; ignore it.
