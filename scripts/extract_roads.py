#!/usr/bin/env python3
import json
import lzma
import sys
from typing import Dict, Iterable, TextIO


KEEP_PROPERTIES = ("name", "name:en", "ref", "highway")
CHUNK_SIZE = 1024 * 1024


def open_input(path: str) -> TextIO:
    if path.endswith(".xz"):
        return lzma.open(path, "rt", encoding="utf-8")
    return open(path, "rt", encoding="utf-8")


def iter_features(path: str) -> Iterable[Dict]:
    decoder = json.JSONDecoder()
    with open_input(path) as handle:
        buffer = ""
        while True:
            chunk = handle.read(CHUNK_SIZE)
            if not chunk:
                raise RuntimeError("Could not find features array in GeoJSON")
            buffer += chunk
            marker_index = buffer.find('"features"')
            if marker_index != -1:
                array_start = buffer.find("[", marker_index)
                if array_start != -1:
                    buffer = buffer[array_start + 1 :]
                    break
            if len(buffer) > CHUNK_SIZE:
                buffer = buffer[-CHUNK_SIZE:]

        while True:
            buffer = buffer.lstrip(" \t\r\n,")
            if buffer.startswith("]"):
                break
            if not buffer:
                buffer += handle.read(CHUNK_SIZE)
                continue
            try:
                feature, consumed = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                more = handle.read(CHUNK_SIZE)
                if not more:
                    raise
                buffer += more
                continue
            buffer = buffer[consumed:]
            yield feature


def is_road(feature: Dict) -> bool:
    geometry = feature.get("geometry") or {}
    geometry_type = geometry.get("type")
    if geometry_type not in ("LineString", "MultiLineString"):
        return False
    props = feature.get("properties") or {}
    return "highway" in props


def trim_properties(feature: Dict) -> Dict:
    props = feature.get("properties") or {}
    trimmed = {key: props[key] for key in KEEP_PROPERTIES if key in props}
    feature["properties"] = trimmed
    return feature


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: extract_roads.py <input.geojson.xz>", file=sys.stderr)
        return 1

    input_path = sys.argv[1]
    for feature in iter_features(input_path):
        if not is_road(feature):
            continue
        trimmed = trim_properties(feature)
        json.dump(trimmed, sys.stdout, separators=(",", ":"))
        sys.stdout.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
