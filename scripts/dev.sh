#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Error: pnpm no está instalado o no está en el PATH." >&2
  exit 1
fi

exec pnpm run dev
