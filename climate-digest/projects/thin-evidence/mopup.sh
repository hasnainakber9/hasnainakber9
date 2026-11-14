#!/bin/bash
# Finish anything incomplete on the 1,200-question core and ask every unanswered question again with a larger token allowance.
cd "$(dirname "$0")"; mkdir -p logs
one() {  # one <model> <max tokens> <threads>
  for c in caution shuffled signal plain; do
    python3 run.py --provider adaption --model $1 --threads $3 --per-minute ${RATE:-46} --max-tokens $2 --condition $c --sample 1200 >> logs/$1.log 2>&1
  done
  python3 run.py --provider adaption --model $1 --threads $3 --per-minute ${RATE:-46} --max-tokens $2 --condition plain --set national >> logs/$1.log 2>&1
}
one glm-5.3-flash 16000 16 & one deepseek-v4-flash 16000 10 & one qwen3.5-397b 16000 12 & one gemma-4-31b-it 4000 6 & one gemma-4-26b-a4b-it 4000 4 &
wait
