# Installing the Crafting Apps

`python3 "$CRAFT" ensure <app>` covers the normal case. This page is for everything around it:
what the releases contain, other ways the user may already have an app, source builds, and fixes.

## What a release contains

Every app releases from the shared pipeline in `storytold/craft-common-actions`. A release is
tagged `v<version>` (for example `v0.17.0`) and carries a `SHA256SUMS.txt` for all of its files.

| Platform | File | Where the CLI is |
|---|---|---|
| Linux x86_64 / aarch64 / riscv64 | `<app>-<ver>-linux-<arch>.tar.gz` | `<app>-<ver>-linux-<arch>/bin/<app>-cli` (an FHS tree: `bin/`, `share/`) |
| Linux (PdfCraft only) | `pdfcraft-cli-<ver>-linux-<arch>.tar.gz` | the CLI alone, for servers and agents |
| Linux packages | `.deb`, `.rpm` | installs `/usr/bin/<app>` and `/usr/bin/<app>-cli` |
| Linux AppImage / Flatpak | `<app>-<ver>-linux-<arch>.AppImage` / `.flatpak` | inside; Flatpak: `flatpak run --command=<app>-cli ai.storyteller.<app>` |
| macOS (universal) | `<app>-cli-<ver>-macos-universal.zip` | `<app>-cli` (signed and notarized); the app itself is the `.dmg` |
| Windows x64 / arm64 / x86 | `<app>-<ver>-windows-<arch>-portable.zip` | `<app>-cli.exe` beside `<app>.exe` (static CRT, no installer needed) |
| Windows installer | `<app>-<ver>-windows-<arch>.msi` | installs both executables |
| FreeBSD x86_64 (some apps also aarch64) | `<app>-<ver>-freebsd-<arch>.tar.gz` | `bin/<app>-cli`, laid out like `/usr/local` |
| Web | `<app>-web-<ver>.zip` | no CLI; the whole app as a static WebAssembly site |

The helper picks the right archive for the OS and CPU, checks it against the digest GitHub
publishes for the asset (or `SHA256SUMS.txt`), extracts only the CLI into `~/.craft-studio/bin`,
and records what it installed in `~/.craft-studio/installed.json`. It refuses a file it cannot
verify unless you pass `--no-verify`.

Pin a version with `--version 0.17.0`; reinstall the latest with `--update`; force a route with
`--from release` or `--from source`.

## Apps the user may already have

`ensure` uses an existing CLI before installing anything:

- `$<APP>_CLI` pointing at a binary, e.g. `PHOTOCRAFT_CLI=/opt/tools/photocraft-cli`.
- `PATH`: the .deb and .rpm packages, Homebrew-style installs, a tarball's `bin/` on `PATH`.
- Usual folders: `/usr/bin`, `/usr/local/bin`, `~/.local/bin`, `/opt/<app>/bin` (Linux);
  `/opt/homebrew/bin`, `/usr/local/bin`, `/Applications/<App>.app/Contents/MacOS` (macOS);
  `%ProgramFiles%\<App>`, `%LOCALAPPDATA%\Programs\<App>` (Windows).

People who want the desktop apps (not just the CLIs) can install them from
[getartcraft.com/apps](https://getartcraft.com/apps), from each repository's releases, or with the
**ArtCraft Launcher** (`storytold/craft-launcher`), a small desktop app that picks the right build
for the OS, checks its SHA-256, installs it and keeps every Crafting App updated.

## Building from source

`ensure` does this automatically when downloads fail. By hand:

```bash
git clone --depth 1 https://github.com/storytold/<app>
cd <app>
cargo build --release --locked -p <app>-cli      # binary: target/release/<app>-cli
```

- **Rust 1.95 or newer** (`rustup update stable`); SoundCraft accepts 1.90. Install Rust from
  https://rustup.rs if `cargo` is missing.
- The helper sets `CARGO_PROFILE_RELEASE_LTO=false` and 16 codegen units (much faster, slightly
  bigger binary; `--lto` keeps the apps' release profile), `CARGO_NET_GIT_FETCH_WITH_CLI=true` (git
  dependencies from `github.com/storytold` go through `git`, which works behind proxies), and one
  shared `CARGO_TARGET_DIR` (`~/.craft-studio/target`) so later apps reuse compiled dependencies.
- Only the CLI is built: no GPU, windowing or audio-device libraries are needed for it.
- Optional features the release builds include and plain source builds leave out:
  `photocraft-cli --features heif` and `lightcraft-cli --features heif` (HEIC input; needs
  libheif), `filmcraft-cli --features whisper` (speech-to-text captions). Build them by hand with
  `cargo build --release --locked -p <app>-cli --features <name>` in `~/.craft-studio/src/<app>`
  with `CARGO_TARGET_DIR=~/.craft-studio/target`, then copy the binary into `~/.craft-studio/bin`.
- Japanese UI and Type fonts come from `storytold/craft-fonts`; point `CRAFT_FONTS_DIR` at a
  clone of it when building. Without it the apps use the system's CJK fonts.
- Disk: the shared build cache grows by roughly 1-3 GB per app. `python3 "$CRAFT" clean --target`
  frees it once the binaries are installed; `clean --src` removes the checkouts.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GitHub releases are not reachable from here` / HTTP 403 | Expected in Claude Code cloud sessions: the helper builds from source instead. Elsewhere, check the network or set `GITHUB_TOKEN` if the API rate limit was hit. |
| `no published SHA-256` | The release has no digest for that file. Prefer `--version` of an older release, or accept with `--no-verify` only if the user agrees. |
| `needs Rust 1.95+` | `rustup update stable`, then rerun. |
| Build killed / out of memory | `ensure <app> --jobs 2` (or 1). |
| `No space left on device` | `python3 "$CRAFT" clean --target`, then rerun; builds need ~5 GB free. |
| Another install is running | The helper waits for it (one install per app at a time). A stale lock older than 4 hours is ignored. |
| macOS says the CLI can't be checked | The CLI zip is notarized but not stapled: the first run checks with Apple online. `spctl --assess --type install -vv <path>` confirms it. |
| Wayland drag-and-drop doesn't open files (desktop app) | Start it under XWayland: `WAYLAND_DISPLAY= <app>`. Not an issue for the CLI. |
