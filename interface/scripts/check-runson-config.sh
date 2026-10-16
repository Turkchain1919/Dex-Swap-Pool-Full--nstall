#!/bin/bash
# Validates .github/runs-on.yml with `roc lint` (the RunsOn CLI).
#
# A malformed or semantically-dead runs-on.yml does not fail loudly at runtime —
# RunsOn parses what it can and silently ignores the rest — so this is the only
# cheap place to catch it.
#
# Two deliberate deviations from the upstream README example:
#
#  1. The config path is explicit. Bare `roc lint` does not descend into
#     `.github/`, so it exits 0 having validated nothing at all.
#  2. Warnings fail the check. `roc lint` exits 0 on warnings, so a
#     deprecated-and-ignored key — `disk:`, dead since v3 — would otherwise
#     merge green while silently doing nothing.
#
# `roc lint` writes pure JSON to stdout even on failure; its summary line goes
# to stderr. Requires `roc` on PATH (the workflow installs it via runs-on/cli).

set -euo pipefail

CONFIG=".github/runs-on.yml"

if [ ! -f "$CONFIG" ]; then
  echo "::error file=$CONFIG::$CONFIG not found — the lint gate has nothing to validate"
  exit 1
fi

# One variable for the report path: the write and every read must agree, or `jq`
# reads a file that does not exist and the gate fails closed on a perfectly
# valid config. Falls back to a temp dir so this is runnable outside Actions.
report="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/roc-lint.json"

# Capturing the status inline keeps `set -e` from aborting before we can
# annotate — the YAML-parse-error case this gate exists for exits non-zero.
lint_rc=0
roc lint --format json "$CONFIG" > "$report" || lint_rc=$?

if ! jq -e . "$report" > /dev/null 2>&1; then
  echo "::error file=$CONFIG::roc lint produced no parseable JSON (exit ${lint_rc})"
  cat "$report" || true
  exit 1
fi

jq . "$report"

if jq -e '.valid and (.diagnostics | length) == 0' "$report" > /dev/null; then
  echo "✅ $CONFIG is valid with no diagnostics."
  exit 0
fi

jq -r --arg config "$CONFIG" '(.diagnostics // [])[]
  | "::\(.severity) file=\($config),line=\(.line // 1),col=\(.column // 1)::\(.message)"' \
  "$report"
echo "::error file=$CONFIG::roc lint reported diagnostics (see annotations above)"
exit 1
