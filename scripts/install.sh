#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${TURKDEX_ENV_FILE:-$ROOT/.env}"
VALIDATE_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --validate-only) VALIDATE_ONLY=true ;;
    --env=*) ENV_FILE="${arg#*=}" ;;
    -h|--help) echo "Usage: $0 [--env=/path/to/.env] [--validate-only]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[[ -f "$ENV_FILE" ]] || { echo "Missing ENV file: $ENV_FILE" >&2; exit 2; }
set -a
. "$ENV_FILE"
set +a
command -v node >/dev/null || { echo "Node.js 22.22.2 is required (match apps/web's pinned engine)" >&2; exit 2; }
node "$ROOT/scripts/validate-env.mjs"
if "$VALIDATE_ONLY"; then exit 0; fi
[[ -d "$ROOT/interface" && -d "$ROOT/apps/api" ]] || { echo "Archive is incomplete" >&2; exit 2; }
if command -v bun >/dev/null; then BUN_BIN="$(command -v bun)";
elif [[ -x "${HOME:-}/.bun/bin/bun" ]]; then BUN_BIN="${HOME}/.bun/bin/bun";
else echo "Bun >=1.3.14 is required; see docs/INSTALL_REQUIREMENTS.md" >&2; exit 2; fi
BUN_VERSION="$("$BUN_BIN" --version)"
LOWEST="$(printf '%s\n%s\n' "$BUN_VERSION" "1.3.14" | sort -V | head -n1)"
[[ "$LOWEST" == "1.3.14" ]] || { echo "Bun >=1.3.14 is required; found $BUN_VERSION" >&2; exit 2; }
if [[ ! -f "$ROOT/interface/tools/uniswap-nx/package.json" ]]; then
  echo "Install blocked: official web/5.166.0 declares tools/uniswap-nx as a workspace and references its Nx generators, but the public source archive does not include that package. The installer will not synthesize an upstream package or deploy a knowingly incomplete app. See docs/INSTALL_REQUIREMENTS.md." >&2
  exit 3
fi
(cd "$ROOT/interface" && "$BUN_BIN" install --frozen-lockfile)
(cd "$ROOT/apps/api" && "$BUN_BIN" install --frozen-lockfile)
(cd "$ROOT/apps/api" && "$BUN_BIN" test)
(cd "$ROOT/interface" && "$BUN_BIN" run web build:production)
echo "Build completed. Configure the host service manager and reverse proxy before activation."
