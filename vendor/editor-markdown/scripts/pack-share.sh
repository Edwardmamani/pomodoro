#!/usr/bin/env bash
# Empaqueta la LIBRERÍA (ui/) en un .zip para enviar a otro desarrollador.
# Excluye electron/ (demo local), node_modules, dist, .git.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME="$(node -p "require('./package.json').name" 2>/dev/null || echo "editor-markdown")"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")"
DATE="$(date +%Y%m%d)"
OUT_DIR="${ROOT}/release"
ZIP_NAME="${NAME}-${VERSION}-${DATE}.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"

mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

STAGE="${OUT_DIR}/.pack-stage"
rm -rf "$STAGE"
mkdir -p "${STAGE}/${NAME}"

rsync -a \
  --exclude '.git/' \
  --exclude '.cursor/' \
  --exclude '.cache/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'ui/dist/' \
  --exclude 'release/' \
  --exclude '.vite/' \
  --exclude 'out/' \
  --exclude 'electron/' \
  --exclude 'scripts/run-electron.cjs' \
  --exclude 'index.html' \
  --exclude 'vite.config.js' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'pnpm-lock.yaml' \
  --exclude 'pnpm-workspace.yaml' \
  --exclude 'ejemplo.md' \
  --exclude 'examples/vite-host/node_modules/' \
  --exclude 'examples/vite-host/dist/' \
  "${ROOT}/" "${STAGE}/${NAME}/"

(
  cd "$STAGE"
  zip -r -q "$ZIP_PATH" "$NAME"
)

rm -rf "$STAGE"

SIZE="$(du -h "$ZIP_PATH" | cut -f1)"
echo "Creado: ${ZIP_PATH} (${SIZE})"
echo "Librería UI (sin electron/). Descomprimir en vendor/${NAME}"
echo "Checklist: pnpm add file:./vendor/${NAME} → import Preview+Toolbar → vite build"
