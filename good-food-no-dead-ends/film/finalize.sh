#!/bin/bash
# Assemble the finished films from renders/<tag>/ and QA each one.
# usage: finalize.sh [tag]        (default: final)
# Writes deliverables/GoodFood_NoDeadEnds_{master_16x9,captioned_16x9,vertical_9x16}.mp4 and the SRT (see assemble.py);
# QA reports and contact sheets go to renders/<tag>/qa/.
set -e
SKILL_DIR=/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio
cd "$(dirname "$0")"
TAG=${1:-final}; D=../deliverables; QA=renders/$TAG/qa
mkdir -p "$QA"
python3 assemble.py "$TAG"
for f in master_16x9:1920x1080 captioned_16x9:1920x1080 vertical_9x16:1080x1920; do
  name=GoodFood_NoDeadEnds_${f%%:*}
  python3 "$SKILL_DIR/scripts/probe_qa.py" "$D/$name.mp4" --expect-size "${f##*:}" --expect-duration 84.5 --loudness -14 || true
  mv -f "$D/$name.qa.json" "$D/$name.contact.png" "$QA/" 2>/dev/null || true
done
ls -la "$D" "$QA"
