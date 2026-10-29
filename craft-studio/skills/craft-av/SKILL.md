---
name: craft-av
description: Edit video, build motion graphics and mix audio with the open-source FilmCraft (Premiere-style), EffectCraft (After Effects-style) and SoundCraft (Pro Tools-style), driven headlessly by their command-line tools. Use whenever the user wants to cut, trim, join, reorder or reframe clips, add titles or captions, color-grade, balance audio and export MP4 or MOV; make animated titles, lower thirds, logo animations, kinetic type, keyframed motion graphics, compositing effects or Lottie animations; or record, edit, clean up, mix, master, normalize or bounce audio, voice-overs, podcasts and music sessions. When a brand-new video must be generated from an idea, narration or AI footage, video-studio leads and these apps do the editing, motion and audio finishing.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build filmcraft-cli, effectcraft-cli and soundcraft-cli. No GPU, display or API keys needed; ffmpeg is handy for probing results.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# Video, motion graphics and audio: FilmCraft, EffectCraft, SoundCraft

FilmCraft is a clean-room Premiere Pro with its own H.264, HEVC, ProRes and AAC codecs and exact
integer frame math. EffectCraft is a clean-room After Effects: compositions, layers, keyframes,
effects, rendering and Lottie export. SoundCraft is a clean-room Pro Tools: tracks, clips,
plugins, mixing and bouncing. All three expose every action as a command for their CLIs.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
FM=$(python3 "$CRAFT" ensure filmcraft)      # filmcraft-cli; installs it on first use
EC=$(python3 "$CRAFT" ensure effectcraft)    # effectcraft-cli
SC=$(python3 "$CRAFT" ensure soundcraft)     # soundcraft-cli
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-25 minutes). Start that in the
background as soon as you know the app you need, and plan the edit meanwhile. If the helper is
missing because this skill was installed on its own, get the CLI from the app's GitHub release
(`storytold/<app>`) or `cargo build --release -p <app>-cli`.

## Pick the app

- **FilmCraft**: footage on a timeline: assemble, cut, trim, reorder, transitions, titles, color,
  audio levels, reframing for 9:16 or 1:1, export.
- **EffectCraft**: designed motion: animated titles, lower thirds, logo stings, shape and text
  animation, compositing effects, renders to video or image sequences, Lottie JSON for apps and web.
- **SoundCraft**: audio as the product: voice-over cleanup, podcast edits, music mixes, EQ and
  dynamics, fades, loudness, bounces and stems to WAV, AIFF or FLAC (for MP3 or AAC, encode the
  bounce with ffmpeg or export it through FilmCraft).
- **Combine**: EffectCraft renders a title, SoundCraft masters the mix, FilmCraft lays both on
  the timeline and exports. With video-studio: it generates scenes, these apps finish them.

## Workflow

1. **Brief**: length, aspect and resolution (16:9 1920x1080, 9:16 1080x1920, 1:1), frame rate,
   platform, music and voice sources, captions, loudness target (-14 LUFS for streaming and
   social, -16 for podcasts, -23 for broadcast). Ask only what blocks the work.
2. **Probe the inputs** (duration, fps, resolution, audio channels) before planning cuts.
3. **Build the project** with commands or a script; keep the native project file so the user can
   open it in the desktop app.
4. **Render a check**: stills at key times, a low-resolution preview, or the full export; probe it
   (duration, streams, loudness) and look at the stills. Fix and re-render.
5. **Deliver** the export (and project file), with length, format, loudness and any credits for
   music or footage.

Subcommands, command ids and recipes: `references/filmcraft.md`, `references/effectcraft.md`,
`references/soundcraft.md`. Each CLI's `--help` and command listing are the ground truth when
anything here disagrees.

## Recipes

RECIPES_PLACEHOLDER

## Rules

- Use footage and music the user owns or that is licensed for the use; note credits.
- Do not create deceptive edits of real people or events; label synthetic media when publishing.
- Long renders: run in the background or with a long timeout and check the output file.
