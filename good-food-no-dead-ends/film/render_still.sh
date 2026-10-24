#!/bin/bash
# usage: render_still.sh <shot> <time> [w h]   -> renders/stills/<shot>_<time>.png (via local http server)
SKILL_DIR=/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio
cd "$(dirname "$0")"; mkdir -p renders/stills
W=${3:-1280}; H=${4:-720}
timeout 300 python3 "$SKILL_DIR/scripts/html_to_video.py" "http://127.0.0.1:8765/proj/film/scenes/$1.html${5:+?$5}" --still "$2" --width $W --height $H -o "renders/stills/$1_$2.png" --no-install --wait 1.0 2>&1 | grep -v "^renders" 
