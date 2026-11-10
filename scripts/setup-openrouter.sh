#!/usr/bin/env bash
# Route Claude Code on this computer through OpenRouter.
# Usage:  bash scripts/setup-openrouter.sh          (set up)
#         bash scripts/setup-openrouter.sh --undo   (go back to your Claude login)
set -euo pipefail

MARK_BEGIN="# >>> openrouter-claude >>>"
MARK_END="# <<< openrouter-claude <<<"

case "${SHELL:-}" in
  */zsh)  PROFILE="$HOME/.zshenv" ;;   # loads early, so the key is set before use
  */fish) echo "fish shell: add the variables to ~/.config/fish/config.fish by hand (see OpenRouter docs)."; exit 1 ;;
  *)      PROFILE="$HOME/.bashrc" ;;
esac

strip_block() { [ -f "$PROFILE" ] && sed -i.bak "/$MARK_BEGIN/,/$MARK_END/d" "$PROFILE" || true; }

if [ "${1:-}" = "--undo" ]; then
  strip_block
  [ "$(uname)" = Darwin ] && security delete-generic-password -s openrouter >/dev/null 2>&1 || true
  echo "Removed OpenRouter settings from $PROFILE. Open a new terminal, then run 'claude' and /login."
  exit 0
fi

command -v claude >/dev/null || { echo "Installing Claude Code..."; curl -fsSL https://claude.ai/install.sh | bash; }

printf "Paste your OpenRouter API key (from https://openrouter.ai/settings/keys), then Enter: "
read -rs KEY; echo
case "$KEY" in sk-or-*) ;; *) echo "That doesn't look like an OpenRouter key (sk-or-...). Nothing changed."; exit 1 ;; esac

# Check the key works before saving it.
if ! curl -fsS -H "Authorization: Bearer $KEY" https://openrouter.ai/api/v1/key >/dev/null; then
  echo "OpenRouter rejected that key. Nothing changed."; exit 1
fi

strip_block
if [ "$(uname)" = Darwin ]; then
  # macOS: keep the key in the Keychain, not in a plain-text file.
  security add-generic-password -U -s openrouter -a "$USER" -w "$KEY"
  KEYLINE='export OPENROUTER_API_KEY="$(security find-generic-password -s openrouter -w 2>/dev/null)"'
else
  umask 077; printf '%s' "$KEY" > "$HOME/.openrouter_key"
  KEYLINE='export OPENROUTER_API_KEY="$(cat "$HOME/.openrouter_key" 2>/dev/null)"'
fi

cat >> "$PROFILE" <<EOF
$MARK_BEGIN
$KEYLINE
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="\$OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
export ANTHROPIC_DEFAULT_OPUS_MODEL="~anthropic/claude-opus-latest[1m]"
export ANTHROPIC_DEFAULT_SONNET_MODEL="~anthropic/claude-sonnet-latest[1m]"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="~anthropic/claude-haiku-latest"
$MARK_END
EOF

echo "Done. Settings added to $PROFILE."
echo "Next: open a NEW terminal, run 'claude', type /logout once if you were signed in before,"
echo "restart 'claude', then type /status. It should show ANTHROPIC_AUTH_TOKEN and https://openrouter.ai/api."
