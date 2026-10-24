#!/bin/bash
# Resumable, time-budgeted render of scene pages (for hosts that stop long jobs, e.g. a 2-hour background cap).
# usage: render_resume.sh <tag> <width> <height> <fps> <budget-seconds> scene ...
#   - skips scenes whose renders/<tag>/<scene>.mp4 already has the full frame count
#   - renders into renders/<tag>/.partial/ and moves a clip into place only after its frame count checks out,
#     so an interrupted job never leaves a broken clip behind
#   - does not start a scene that would not finish inside the budget (estimate = frames x seconds-per-frame);
#     it tries the remaining, shorter scenes instead and lists what is left for the next run
SKILL_DIR=/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio
SERVE_DIR=/tmp/claude-0/-home-user-hasnainakber9/11d740fd-0a4d-5eae-ae57-4929a6b7f4b6/scratchpad   # holds the proj -> project symlink
cd "$(dirname "$0")"
TAG=$1; W=$2; H=$3; FPS=$4; BUDGET=$5; shift 5
OUT=renders/$TAG; TMP=$OUT/.partial; mkdir -p "$TMP"
T0=$(date +%s)
# seconds per 1080p frame on this 4-core software-GL host, with headroom, for the realistic cast with SMAA
# (multisampling off). Measured: s05 about 5; the rest scaled from the clay renders and the stills.
declare -A SPF=( [s01]=7 [s02]=16 [s03]=17 [s04]=22 [s05]=6 [s06]=9 [s07]=10 [s08]=10 [s09a]=9 [s09b]=13 [s10]=10 [s11]=1.2 )
declare -A DUR=( [s01]=6.0 [s02]=8.5 [s03]=7.5 [s04]=8.0 [s05]=8.0 [s06]=9.0 [s07]=8.5 [s08]=10.0 [s09a]=4.6 [s09b]=3.4 [s10]=6.5 [s11]=4.5 )
count() { ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$1" 2>/dev/null; }

# the page server lives exactly as long as this job (an existing one is reused)
if ! curl -s -o /dev/null "http://127.0.0.1:8765/proj/film/scenes/s01.html"; then
  (cd "$SERVE_DIR" && exec python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1) &
  SERVER=$!; trap 'kill $SERVER 2>/dev/null' EXIT; sleep 1
fi

left=()
for s in "$@"; do
  n=$(python3 -c "print(int(round(${DUR[$s]} * $FPS)))")
  if [ "$(count "$OUT/$s.mp4")" = "$n" ]; then echo "$s already complete ($n frames)"; continue; fi
  need=$(python3 -c "print(int($n * ${SPF[$s]} + 90))"); used=$(( $(date +%s) - T0 ))
  if [ $(( used + need )) -gt "$BUDGET" ]; then
    echo "$s deferred (used ${used}s, needs ~${need}s, budget ${BUDGET}s)"; left+=("$s"); continue
  fi
  t=$(date +%s)
  timeout $(( BUDGET + 250 - used )) python3 "$SKILL_DIR/scripts/html_to_video.py" "http://127.0.0.1:8765/proj/film/scenes/$s.html" \
    -o "$TMP/$s.mp4" --width "$W" --height "$H" --fps "$FPS" --no-install --wait 1.5 --crf "${CRF:-16}" --preset "${PRESET:-medium}" > "$OUT/$s.log" 2>&1
  rc=$?; got=$(count "$TMP/$s.mp4"); dt=$(( $(date +%s) - t ))
  if [ $rc -eq 0 ] && [ "$got" = "$n" ]; then mv -f "$TMP/$s.mp4" "$OUT/$s.mp4"; st=ok; else st="FAILED rc=$rc frames=${got:-0}/$n"; left+=("$s"); fi
  echo "$s $st ${dt}s ($(python3 -c "print(round($dt / $n, 2))") s/frame)" | tee -a "$OUT/progress.txt"
done
if [ ${#left[@]} -eq 0 ]; then echo "ALL DONE" | tee -a "$OUT/progress.txt"; else echo "LEFT FOR NEXT RUN: ${left[*]}" | tee -a "$OUT/progress.txt"; fi
