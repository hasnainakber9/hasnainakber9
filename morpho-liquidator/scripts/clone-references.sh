#!/usr/bin/env bash
# Clones the reference repositories into references/ at the commits this
# project was designed against (references/PINNED). They are study material:
# gitignored, never imported, never built.
#
#   scripts/clone-references.sh            pinned commits
#   scripts/clone-references.sh --latest   default-branch heads instead
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p references
latest=false
[[ "${1:-}" == "--latest" ]] && latest=true

while read -r repo commit; do
  [[ -z "${repo}" || "${repo}" == \#* ]] && continue
  dir="references/$(basename "${repo}")"
  if [[ ! -d "${dir}/.git" ]]; then
    git clone --quiet "https://github.com/${repo}.git" "${dir}"
  else
    git -C "${dir}" fetch --quiet origin
  fi
  if [[ "${latest}" == true ]]; then
    git -C "${dir}" checkout --quiet "$(git -C "${dir}" symbolic-ref --short refs/remotes/origin/HEAD)"
  else
    git -C "${dir}" checkout --quiet "${commit}"
  fi
  echo "${repo} @ $(git -C "${dir}" rev-parse --short HEAD)"
done < references/PINNED
