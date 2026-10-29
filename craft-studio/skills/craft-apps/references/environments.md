# Where the apps run, and what works there

Run `python3 "$CRAFT" status --online` once per session. It reports the platform, the tools
present (git, cargo, rustc, claude, ffmpeg), free disk, whether a display exists, which release
sources are reachable, and every app CLI that is already installed.

All thirteen CLIs run headless: no GPU, no display, no API keys. What changes between
environments is how the binaries arrive and whether the desktop apps can be shown.

## How `ensure` gets a binary

1. An installed CLI: `$<APP>_CLI`, `~/.craft-studio/bin`, `PATH`, the usual install folders.
2. A release download, SHA-256 checked. The version and checksums come from the GitHub API, else
   the ArtCraft Launcher's release feed (all apps but FigCraft), else the releases page, else the
   newest `vX.Y.Z` tag read with `git ls-remote` plus the release's `SHA256SUMS.txt`.
3. A source build of that release tag (`git` + `cargo`), falling back to the default branch only
   if the tag does not compile.

## claude.ai chat (code execution sandbox)

- Linux x86_64, a few CPUs, no GPU, no display. Files last for the conversation.
- GitHub release downloads are normally reachable, so `ensure` installs a CLI in seconds. If no
  release source is reachable and there is no Rust toolchain, say so and offer the commands for
  the user's machine instead of producing a lesser result.
- MCP servers cannot be registered here; call the CLIs from the shell.
- Send results with the file-sending tool; render a PNG preview for anything visual.

## Claude Code cloud sessions (claude.ai/code, the Claude app)

- Linux container behind a proxy. GitHub's API and web pages are limited to the session's own
  repositories, but release downloads, `git` clones of public repositories and the launcher feed
  get through. Measured here: every app installed from its release in 2-5 seconds.
- If a release cannot be fetched, the source build is the fallback (Rust is preinstalled). First
  builds measured on 4 CPUs with a shared build cache: PdfCraft 8.4 min (cold cache), WordCraft
  5.2, GridCraft 1.5, DeckCraft 3.0, CADCraft 4.1, VectorCraft 8.3, DesignCraft 5.2. Run a build in
  the background as soon as you know the app you need, and plan the work meanwhile.
- The container is reclaimed when the session ends, so the next session installs again (seconds
  with releases). An environment setup script can preinstall the apps the user relies on:
  `python3 <plugin>/skills/craft-apps/scripts/craft.py ensure wordcraft`.
- No display: the desktop apps and their control channels are not available; everything goes
  through the CLIs.

## Claude Code, Cowork or the desktop app on the user's computer

- Release downloads work, so every CLI installs in seconds into `~/.craft-studio/bin` (no admin
  rights). Apps the user installed themselves (.deb/.rpm, MSI, the macOS CLI zip, the ArtCraft
  Launcher) are found and reused.
- MCP servers can be registered for the session or for good:
  `python3 "$CRAFT" mcp <app> --root <folder> --register` (see `mcp.md`).
- The desktop apps can be started with their control channel so the user watches Claude work, or
  so Claude can reach UI-only features (screenshots, clicks, dialogs).
- Windows: use `py` if `python3` is missing; binaries end in `.exe`; paths with spaces need quotes.

## Fonts

Release builds embed the craft-fonts faces (Japanese, Chinese, Korean, Arabic script including
Urdu, Hebrew, Thai, Devanagari, plus some apps' theme fonts). Source builds made by `ensure`
fetch the craft-fonts commit the app's releases pin and embed it too (set `CRAFT_FONTS_DIR` to use
another checkout). If text in a non-Latin script still renders as boxes, install system fonts
(Debian/Ubuntu: `fonts-noto-core fonts-noto-cjk`); the apps fall back to them.
