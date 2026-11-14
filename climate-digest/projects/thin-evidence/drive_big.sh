#!/bin/bash
# The large model, in priority order. Shares the rate limit with drive.sh through runs/.pace.
cd "$(dirname "$0")"; mkdir -p logs
q() { python3 run.py --provider adaption --model qwen3.5-397b --threads 16 --per-minute ${RATE:-45} --max-tokens 8000 "$@" >> logs/qwen3.5-397b.log 2>&1; }
q --condition plain --sample 1200
q --condition plain --set national
for c in signal shuffled caution; do q --condition $c --sample 1200; done
q --condition plain
for c in signal shuffled caution; do q --condition $c --sample 2400; done
echo ALL DONE >> logs/drive_big.log
