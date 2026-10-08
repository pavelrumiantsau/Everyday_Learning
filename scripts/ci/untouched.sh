#!/usr/bin/env bash
# Colleagues extension (docs/EXTENSION-PLAN.md §4.4): extension branches must not change Spanish or French materials.
# Runs in CI on pull requests; locally: BASE_REF=main bash scripts/ci/untouched.sh
set -euo pipefail
branch="${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}"
case "$branch" in
  feat/colleagues-*|content/lt-foundation-*) ;;
  *) echo "untouched: '$branch' is not an extension branch, skipped"; exit 0 ;;
esac
base=$(git merge-base HEAD "${BASE_REF:-origin/main}")
changed=$(git diff --name-only "$base" HEAD -- \
  content/es content/fr \
  prompts/content/es-vocab.md prompts/content/fr-vocab.md \
  apps/miniapp/public/audio/es apps/miniapp/public/audio/fr \
  scripts/batches/es-* scripts/batches/fr-*)
if [ -n "$changed" ]; then
  echo "✗ Spanish/French materials changed on extension branch '$branch' (not allowed, EXTENSION-PLAN §4.4):"
  echo "$changed"
  exit 1
fi
echo "✓ Spanish/French materials untouched ($branch vs $(git rev-parse --short "$base"))"
