# Where the apps run, and what works there

Run `python3 "$CRAFT" status --online` once per session. It reports the platform, the tools
present (git, cargo, rustc, claude, ffmpeg), free disk, whether a display exists, whether GitHub
release downloads are reachable, and every app CLI that is already installed.

All thirteen CLIs run headless: no GPU, no display, no API keys. What changes between
environments is how the binaries arrive and whether the desktop apps can be shown.

## claude.ai chat (code execution sandbox)

- Linux x86_64, a few CPUs, no GPU, no display. Files last for the conversation.
- GitHub release downloads are normally reachable, so `ensure` installs a CLI in seconds.
  If they are not, and there is no Rust toolchain, say so and offer the commands for the user's
  machine instead of producing a lesser result.
- MCP servers cannot be registered here; call the CLIs from the shell.
- Send results with the file-sending tool; render a PNG preview for anything visual.

## Claude Code cloud sessions (claude.ai/code, the Claude app)

- Linux container behind a proxy. GitHub's web, API and release downloads are limited to the
  session's own repositories, so `ensure` falls back to building from source: anonymous git
  clones of the public storytold repositories work, and crates come from crates.io.
- Measured on a 4-CPU session: see the timing table below. Start the build in the background
  (`run_in_background`, or a long timeout) as soon as you know which app the job needs, and plan
  or draft while it compiles. Every later call is instant.
- The container is reclaimed when the session ends, so the next session builds again. If the user
  wants an app ready from the start, a line in the environment's setup script does it, e.g.
  `python3 <plugin>/skills/craft-apps/scripts/craft.py ensure wordcraft` (the setup script runs
  before every new session, so keep it to the apps they use most).
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

## Build times for a first source build

Measured in a Claude Code cloud session (4 CPUs, 15 GB RAM), one app after another with the shared
build cache, LTO off. Later builds of other apps are faster because common dependencies are reused.

| App | Minutes | App | Minutes |
|---|---|---|---|
| pdfcraft | (pending) | effectcraft | (pending) |
| wordcraft | (pending) | filmcraft | (pending) |
| gridcraft | (pending) | soundcraft | (pending) |
| deckcraft | (pending) | photocraft | (pending) |
| cadcraft | (pending) | lightcraft | (pending) |
| vectorcraft | (pending) | figcraft | (pending) |
| designcraft | (pending) | | |
