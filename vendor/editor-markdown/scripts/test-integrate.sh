#!/usr/bin/env bash
# Smoke: Preview + Toolbar + createDocument vía aliases (sin file: anidado).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${ROOT}/examples/vite-host"

cd "$HOST"

if [[ ! -d node_modules/vite ]]; then
  echo "Instala deps del smoke una vez: (cd examples/vite-host && pnpm install)"
  exit 1
fi

# Asegura que highlight.js / codemirror del paquete raíz resuelvan
export NODE_PATH="${ROOT}/node_modules${NODE_PATH:+:$NODE_PATH}"

pnpm exec vite build
echo "OK: examples/vite-host build passed"
