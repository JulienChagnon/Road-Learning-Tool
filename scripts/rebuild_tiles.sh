#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_INPUT="planet_-75.957,45.231_-75.416,45.497.osm.geojson.xz"

INPUT_PATH="${1:-$ROOT_DIR/$DEFAULT_INPUT}"
CITY="${2:-ottawa}"
TILES_DIR="$ROOT_DIR/public/tiles/$CITY"
CATALOG_PATH="$ROOT_DIR/public/roads/$CITY.json"
EXTRACT_SCRIPT="$ROOT_DIR/scripts/extract_roads.py"
CATALOG_SCRIPT="$ROOT_DIR/scripts/build_road_catalog.py"

if [ ! -f "$INPUT_PATH" ]; then
  echo "Input GeoJSON not found: $INPUT_PATH" >&2
  exit 1
fi

if [ ! -f "$EXTRACT_SCRIPT" ]; then
  echo "Missing extract script: $EXTRACT_SCRIPT" >&2
  exit 1
fi

if [ ! -f "$CATALOG_SCRIPT" ]; then
  echo "Missing catalog script: $CATALOG_SCRIPT" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not found in PATH." >&2
  exit 1
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

mkdir -p "$TILES_DIR" "$(dirname "$CATALOG_PATH")"

tmpfile="$(mktemp /tmp/roads-XXXX.ndjson)"
cleanup() {
  rm -f "$tmpfile"
}
trap cleanup EXIT

echo "Extracting road features from $INPUT_PATH..."
python3 "$EXTRACT_SCRIPT" "$INPUT_PATH" > "$tmpfile"

echo "Building vector tiles in $TILES_DIR..."
"$TIPPECANOE_BIN" \
  --output-to-directory="$TILES_DIR" \
  --force \
  --layer=roads \
  --minimum-zoom=2 \
  --maximum-zoom=14 \
  --full-detail=12 \
  --low-detail=8 \
  --simplify-only-low-zooms \
  --no-feature-limit \
  --no-tile-size-limit \
  --no-tile-compression \
  "$tmpfile"

echo "Rebuilding road catalog at $CATALOG_PATH..."
python3 "$CATALOG_SCRIPT" "$INPUT_PATH" "$CATALOG_PATH"

echo "Done."
