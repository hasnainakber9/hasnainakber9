#!/bin/bash
# One stage of the plan: the same run.py arguments on all five models at once, sharing the rate limit. Exits when all finish.
# Usage: ./stage.sh --condition signal --sample 1200
cd "$(dirname "$0")"; mkdir -p logs
for m in gemma-4-31b-it gemma-4-26b-a4b-it deepseek-v4-flash glm-5.3-flash; do
  python3 run.py --provider adaption --model $m --threads 14 --per-minute ${RATE:-46} "$@" >> logs/$m.log 2>&1 &
done
python3 run.py --provider adaption --model qwen3.5-397b --threads 28 --per-minute ${RATE:-46} --max-tokens 8000 "$@" >> logs/qwen3.5-397b.log 2>&1 &
wait
tail -qn1 logs/[dgq]*.log | cut -c1-120
