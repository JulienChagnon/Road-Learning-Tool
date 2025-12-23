#!/usr/bin/env python3
import json
import lzma
import sys
from typing import Dict, Iterable, TextIO


CHUNK_SIZE = 1024 * 1024
NAME_KEYS = ("name", "name:en", "name_en")


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


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "Usage: build_road_catalog.py <input.geojson.xz> <output.json>",
            file=sys.stderr,
        )
        return 1

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    names = set()
    refs = set()
    for feature in iter_features(input_path):
        if not is_road(feature):
            continue
        props = feature.get("properties") or {}
        for key in NAME_KEYS:
            value = props.get(key)
            if isinstance(value, str):
                trimmed = value.strip()
                if trimmed:
                    names.add(trimmed)
        ref = props.get("ref")
        if isinstance(ref, str):
            trimmed = ref.strip()
            if trimmed:
                refs.add(trimmed)

    output = {"names": sorted(names), "refs": sorted(refs)}
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=True, indent=2)
        handle.write("\n")

    print(
        f"Wrote {len(output['names'])} names and {len(output['refs'])} refs to {output_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
