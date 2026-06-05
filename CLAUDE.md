# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build to docs/ (for GitHub Pages)
npm run lint         # ESLint
npm run preview      # Preview production build
npm run rebuild-tiles  # Regenerate vector tiles (requires DuckDB + Tippecanoe)
```

The build output goes to `docs/` (not `dist/`) because the repo is deployed via GitHub Pages from that folder. The base URL is `/Road-Learning-Tool/`.

## Architecture

This is a single-page React 19 app using MapLibre GL for interactive maps and a custom quiz engine for road/building learning. The entire app is essentially two files: `App.jsx` (viewport tracking + Matomo analytics injection) and `MapView.jsx` (~3700 lines — the core of the application).

### MapView.jsx structure

`MapView.jsx` handles everything: map initialization, vector tile loading, road catalog indexing, quiz state, and all UI. It's intentionally monolithic. Key sections:

- **Map setup**: MapLibre GL instance with Google satellite imagery as base layer
- **Vector tile layers**: Roads, building outlines, road labels, building name labels — all rendered from static PBF tiles in `public/assets/tiles/{city}/{z}/{x}/{y}.pbf`
- **Road catalog**: JSON files at `public/assets/roads/{city}.json` — loaded on city switch, indexed in-memory for fuzzy matching
- **Quiz engine**: Two modes — road quiz (find a road by name on the map) and building quiz (Kingston campus only). Uses a queue-based system with per-session scoring
- **URL routing**: Hash-based (`#/city/quiz` or `#/city/buildings`) for shareable links

### Multi-city support

Three cities are configured: Ottawa/Gatineau (default), Montreal, and Kingston (Queen's University campus). Kingston has an additional building quiz mode. City switching reloads tile sources and road catalog.

### Fuzzy road matching

Roads are indexed with tokenization, normalization, and diacritic folding so users can find roads despite spelling variations. This index is built in-memory from the catalog JSON on each city load.

### Data pipeline (tile regeneration)

Tiles are pre-built static assets committed to `public/assets/`. To regenerate:
1. `scripts/load_roads.sql` / `load_buildings.sql` — DuckDB extracts from OSM GeoJSON (`.xz` compressed)
2. Tippecanoe generates PBF tiles (zoom 2–14)
3. `scripts/build_road_catalog.sql` — produces JSON catalog

This pipeline runs via `npm run rebuild-tiles` but requires DuckDB and Tippecanoe installed locally.
