#!/bin/bash
# usage: render_scenes.sh <tag> <width> <height> <fps> [scene ...]
# Renders each scene page (deterministic virtual time) to renders/<tag>/<scene>.mp4 via the video-studio renderer.
SKILL_DIR=/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio
cd "$(dirname "$0")"
TAG=$1; W=$2; H=$3; FPS=$4; shift 4
SCENES=${@:-s01 s02 s03 s04 s05 s06 s07 s08 s09a s09b s10 s11}
mkdir -p renders/$TAG
for s in $SCENES; do
  t0=$(date +%s)
  timeout 7200 python3 "$SKILL_DIR/scripts/html_to_video.py" "http://127.0.0.1:8765/proj/film/scenes/$s.html" -o "renders/$TAG/$s.mp4" \
    --width $W --height $H --fps $FPS --no-install --wait 1.5 --crf ${CRF:-16} --preset ${PRESET:-medium} > "renders/$TAG/$s.log" 2>&1
  echo "$s exit=$? $(( $(date +%s) - t0 ))s $(tail -1 renders/$TAG/$s.log)" >> renders/$TAG/progress.txt
done
echo DONE >> renders/$TAG/progress.txt
