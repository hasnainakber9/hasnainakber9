#!/bin/bash
# SessionStart hook: install the Python libraries the project skills rely on.
# Only runs in Claude Code cloud sessions (fresh containers); skips if already installed.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if python3 -c "import statsmodels, pmdarima, sktime, darts, stumpy, pyod, neuralforecast, olostep, tqdm" 2>/dev/null; then
  exit 0
fi

REQ="${CLAUDE_PROJECT_DIR:-.}/.claude/requirements-skills.txt"
# CPU-only torch first so neuralforecast/darts don't pull the multi-GB CUDA build.
pip install --break-system-packages -q \
  --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple torch
pip install --break-system-packages -q -r "$REQ"
