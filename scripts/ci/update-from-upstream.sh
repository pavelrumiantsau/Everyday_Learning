#!/usr/bin/env bash
# Update workflow of a colleague's copy (docs/EXTENSION-PLAN.md §3.3): bring the copy's files to the newest upstream main.
# Copies keep no local file changes (settings live in their D1 database), so the upstream tree simply replaces theirs.
# .github/workflows/ stays as it is: GitHub doesn't let the workflow token change workflow files. When upstream changed
# them, the run summary says so; with INCLUDE_WORKFLOWS=true (the copy added a WORKFLOWS_TOKEN secret) they are updated too. Leaves a commit (not pushed) and sets `changed=true|false` for the next steps.
set -euo pipefail
UPSTREAM="${EL_UPSTREAM:-https://github.com/pavelrumiantsau/Everyday_Learning.git}"
out() { [ -n "${GITHUB_OUTPUT:-}" ] && echo "$1" >> "$GITHUB_OUTPUT" || echo "$1"; }
note() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && echo "$1" >> "$GITHUB_STEP_SUMMARY" || echo "$1"; }

git fetch --no-tags --quiet "$UPSTREAM" main
upstream=$(git rev-parse FETCH_HEAD)

# The upstream tree, except our own workflow files.
git read-tree --reset -u "$upstream"
if [ "${INCLUDE_WORKFLOWS:-false}" != true ]; then
  git rm -r -q --cached --ignore-unmatch .github/workflows
  rm -rf .github/workflows
  git checkout HEAD -- .github/workflows
fi

if git diff --quiet "$upstream" -- .github/workflows; then
  out "workflows_behind=false"
else
  out "workflows_behind=true"
  note "⚠️ В новой версии изменились файлы workflows — их GitHub не даёт обновить автоматически. Инструкция: docs/SETUP-COPY.md → «Обновление workflows»."
fi

if git diff --cached --quiet HEAD; then
  echo "Already up to date with upstream ${upstream:0:7}."
  out "changed=false"
  exit 0
fi
git -c user.name="update-bot" -c user.email="update-bot@users.noreply.github.com" \
  commit -q -m "Update from upstream ${upstream:0:7}"
echo "Updated to upstream ${upstream:0:7}:"
git show --stat --oneline HEAD | tail -1
out "changed=true"
note "Обновлено до версии ${upstream:0:7}."
