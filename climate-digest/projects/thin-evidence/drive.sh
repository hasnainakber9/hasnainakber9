#!/bin/bash
# The main run, in priority order. Every step is resumable; samples are nested.
cd "$(dirname "$0")"; mkdir -p logs
M="gemma-4-31b-it gemma-4-26b-a4b-it deepseek-v4-flash glm-5.3-flash"
step() {  # step <extra args...> : the same command on every model at once, sharing one rate limit
  for m in $M; do python3 run.py --provider adaption --model $m --threads 8 --per-minute ${RATE:-55} "$@" >> logs/$m.log 2>&1 & done; wait
}
step --condition plain --sample 1200
step --condition plain --set national
for c in signal shuffled caution; do step --condition $c --sample 1200; done
step --condition plain
for c in signal shuffled caution; do step --condition $c --sample 2400; done
for c in signal shuffled caution; do step --condition $c; done
echo ALL DONE >> logs/drive.log
