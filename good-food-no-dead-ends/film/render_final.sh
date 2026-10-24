#!/bin/bash
# The final film's scene clips, resumable and time-budgeted (for hosts that stop long jobs, e.g. a 2-hour background cap).
# usage: render_final.sh <tag> <budget-seconds> scene ...      (sub-frames per frame: SUB, default 4)
#   - 3D scenes: render_frames.py writes lossless frames to renders/<tag>/frames/<scene>/ (skipping frames already there)
#     with SUB sub-frames each (motion blur + anti-aliasing), then encodes renders/<tag>/<scene>.mp4 once complete
#   - s11 (the HTML title card) and its native 9:16 version: html_to_video.py, seconds each
#   - stops before the budget runs out; run it again with the same arguments to carry on
SKILL_DIR=/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio
SERVE_DIR=/tmp/claude-0/-home-user-hasnainakber9/11d740fd-0a4d-5eae-ae57-4929a6b7f4b6/scratchpad   # holds the proj -> project symlink
cd "$(dirname "$0")"
TAG=$1; BUDGET=$2; shift 2; SUB=${SUB:-4}
OUT=renders/$TAG; mkdir -p "$OUT"; T0=$(date +%s)
if ! curl -s -o /dev/null "http://127.0.0.1:8765/proj/film/scenes/s01.html"; then
  (cd "$SERVE_DIR" && exec python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1) &
  SERVER=$!; trap 'kill $SERVER 2>/dev/null' EXIT; sleep 1
fi
for s in "$@"; do
  left=$(( BUDGET - ($(date +%s) - T0) )); [ $left -lt 300 ] && { echo "budget spent; next: $s" | tee -a "$OUT/progress.txt"; exit 3; }
  if [ "$s" = s11 ]; then
    for v in "s11:1920:1080" "s11_vertical:1080:1920"; do IFS=: read name w h <<< "$v"
      [ -f "$OUT/$name.mp4" ] && continue
      python3 "$SKILL_DIR/scripts/html_to_video.py" "http://127.0.0.1:8765/proj/film/scenes/s11.html" -o "$OUT/.$name.mp4" --width $w --height $h --fps 24 \
        --no-install --wait 1.5 --frame-format png --crf 14 --preset slow > "$OUT/$name.log" 2>&1 && mv -f "$OUT/.$name.mp4" "$OUT/$name.mp4" && echo "$name ok" | tee -a "$OUT/progress.txt"
    done; continue
  fi
  [ -f "$OUT/$s.mp4" ] && { echo "$s already encoded"; continue; }
  python3 render_frames.py "$s" "$TAG" --sub "$SUB" --budget "$left" --encode 2>&1 | tee -a "$OUT/$s.log" | tail -2
  if [ ! -f "$OUT/$s.mp4" ]; then echo "stopped in $s" | tee -a "$OUT/progress.txt"; exit 3; fi
  echo "$s ok $(date -u +%H:%M)" | tee -a "$OUT/progress.txt"
done
echo "ALL DONE" | tee -a "$OUT/progress.txt"
