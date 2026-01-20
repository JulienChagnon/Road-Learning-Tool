#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_INPUT="Kingston.xz"

INPUT_PATH="${1:-$ROOT_DIR/$DEFAULT_INPUT}"
CITY="${2:-kingston}"
TILES_DIR="$ROOT_DIR/public/assets/tiles/$CITY/buildings"
LOAD_SCRIPT="$ROOT_DIR/scripts/load_buildings.sql"

if [ ! -f "$INPUT_PATH" ]; then
  echo "Input GeoJSON not found: $INPUT_PATH" >&2
  exit 1
fi

if [ ! -f "$LOAD_SCRIPT" ]; then
  echo "Missing load script: $LOAD_SCRIPT" >&2
  exit 1
fi

DUCKDB_BIN="${DUCKDB_BIN:-}"
if [ -z "$DUCKDB_BIN" ]; then
  if command -v duckdb >/dev/null 2>&1; then
    DUCKDB_BIN="$(command -v duckdb)"
  else
    echo "duckdb not found. Install it or set DUCKDB_BIN." >&2
    exit 1
  fi
fi

TIPPECANOE_BIN="${TIPPECANOE_BIN:-}"
if [ -z "$TIPPECANOE_BIN" ]; then
  if command -v tippecanoe >/dev/null 2>&1; then
    TIPPECANOE_BIN="$(command -v tippecanoe)"
  elif [ -x /tmp/tippecanoe-src/tippecanoe ]; then
    TIPPECANOE_BIN="/tmp/tippecanoe-src/tippecanoe"
  else
    echo "tippecanoe not found. Install it or set TIPPECANOE_BIN." >&2
    exit 1
  fi
fi

mkdir -p "$TILES_DIR"

tmpfile="$(mktemp /tmp/buildings-XXXX.ndjson)"
cleanup() {
  rm -f "$tmpfile"
}
trap cleanup EXIT

echo "Extracting building features from $INPUT_PATH..."
INPUT_PATH="$INPUT_PATH" OUTPUT_PATH="$tmpfile" \
  envsubst '${INPUT_PATH} ${OUTPUT_PATH}' < "$LOAD_SCRIPT" | "$DUCKDB_BIN"

echo "Building vector tiles in $TILES_DIR..."
"$TIPPECANOE_BIN" \
  --output-to-directory="$TILES_DIR" \
  --force \
  --layer=buildings \
  --minimum-zoom=12 \
  --maximum-zoom=16 \
  --full-detail=12 \
  --low-detail=9 \
  --simplify-only-low-zooms \
  --no-feature-limit \
  --no-tile-size-limit \
  --no-tile-compression \
  "$tmpfile"

echo "Done."
