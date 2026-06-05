import {
  ROAD_SOURCE_ID,
  ROAD_BASE_LAYER_ID,
  ROAD_LAYER_ID,
  ROAD_LABEL_LAYER_ID,
  ROAD_SOURCE_LAYER,
  ROAD_TILE_MIN_ZOOM,
  ROAD_TILE_MAX_ZOOM,
  BUILDING_SOURCE_ID,
  BUILDING_FILL_LAYER_ID,
  BUILDING_OUTLINE_LAYER_ID,
  BUILDING_LABEL_SOURCE_ID,
  BUILDING_LABEL_LAYER_ID,
  BUILDING_SOURCE_LAYER,
  BUILDING_TILE_MIN_ZOOM,
  BUILDING_TILE_MAX_ZOOM,
  KINGSTON_FIELD_LABEL_SOURCE_ID,
  KINGSTON_FIELD_LABEL_LAYER_ID,
  getRoadTileUrl,
  getBuildingTileUrl,
  CITY_CONFIG
} from "./config.js";
import { ROAD_LABEL_SIZE_EXPRESSION } from "./colors.js";
import {
  KINGSTON_BUILDING_COLOR_EXPRESSION,
  KINGSTON_BUILDING_LABEL_COLOR,
  KINGSTON_BUILDING_LABEL_HALO_COLOR,
  BUILDING_RENDER_FILTER,
  KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION,
  KINGSTON_BUILDING_OUTLINE_OPACITY,
  EMPTY_BUILDING_LABEL_GEOJSON,
  KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION,
  KINGSTON_FIELD_LABEL_GEOJSON,
  KINGSTON_FIELD_LABEL_TEXT_SIZE_EXPRESSION,
  KINGSTON_FIELD_LABEL_TEXT_COLOR,
  KINGSTON_FIELD_LABEL_HALO_COLOR
} from "./buildings.js";

export const ensureRoadLayer = (map, city, initialFilter, lineColorExpression, textColorExpression, labelTextExpression) => {
  if (!map.getSource(ROAD_SOURCE_ID)) {
    map.addSource(ROAD_SOURCE_ID, {
      type: "vector",
      tiles: [getRoadTileUrl(city)],
      minzoom: ROAD_TILE_MIN_ZOOM,
      maxzoom: ROAD_TILE_MAX_ZOOM,
      bounds: CITY_CONFIG[city].tileBounds
    });
  }
  if (!map.getLayer(ROAD_BASE_LAYER_ID)) {
    map.addLayer({
      id: ROAD_BASE_LAYER_ID,
      type: "line",
      source: ROAD_SOURCE_ID,
      "source-layer": ROAD_SOURCE_LAYER,
      filter: ["has", "highway"],
      paint: {
        "line-color": "#c1c7cbff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 12, 1.8, 15, 2.4],
        "line-opacity": 0
      }
    });
  }
  if (!map.getLayer(ROAD_LAYER_ID)) {
    map.addLayer({
      id: ROAD_LAYER_ID,
      type: "line",
      source: ROAD_SOURCE_ID,
      "source-layer": ROAD_SOURCE_LAYER,
      filter: initialFilter,
      paint: {
        "line-color": lineColorExpression,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.6, 8, 2.6, 12, 4, 15, 6],
        "line-opacity": 1
      }
    });
  }
  if (!map.getLayer(ROAD_LABEL_LAYER_ID)) {
    map.addLayer({
      id: ROAD_LABEL_LAYER_ID,
      type: "symbol",
      source: ROAD_SOURCE_ID,
      "source-layer": ROAD_SOURCE_LAYER,
      filter: initialFilter,
      minzoom: ROAD_TILE_MIN_ZOOM,
      layout: {
        "symbol-placement": "line",
        "text-field": labelTextExpression,
        "text-font": ["Noto Sans Regular", "Open Sans Regular"],
        "text-max-angle": 80,
        "symbol-spacing": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ROAD_TILE_MIN_ZOOM,
          60,
          10,
          150,
          14,
          250
        ],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-avoid-edges": false,
        "text-size": ROAD_LABEL_SIZE_EXPRESSION,
        "text-max-width": 8,
        "text-keep-upright": true,
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "map"
      },
      paint: {
        "text-color": textColorExpression,
        "text-halo-color": lineColorExpression,
        "text-halo-width": 2,
        "text-halo-blur": 0.5
      }
    });
  }
};
export const ensureBuildingLayer = (map, city) => {
  const tileUrl = getBuildingTileUrl(city);
  if (!tileUrl) return;
  const fillColor = KINGSTON_BUILDING_COLOR_EXPRESSION;
  const labelTextColor = KINGSTON_BUILDING_LABEL_COLOR;
  const labelHaloColor = KINGSTON_BUILDING_LABEL_HALO_COLOR;
  if (!map.getSource(BUILDING_SOURCE_ID)) {
    map.addSource(BUILDING_SOURCE_ID, {
      type: "vector",
      tiles: [tileUrl],
      minzoom: BUILDING_TILE_MIN_ZOOM,
      maxzoom: BUILDING_TILE_MAX_ZOOM,
      bounds: CITY_CONFIG[city].tileBounds
    });
  }
  const beforeRoadBase = map.getLayer(ROAD_BASE_LAYER_ID) ? ROAD_BASE_LAYER_ID : void 0;
  const beforeRoadLabel = map.getLayer(ROAD_LABEL_LAYER_ID) ? ROAD_LABEL_LAYER_ID : void 0;
  if (!map.getLayer(BUILDING_FILL_LAYER_ID)) {
    map.addLayer(
      {
        id: BUILDING_FILL_LAYER_ID,
        type: "fill",
        source: BUILDING_SOURCE_ID,
        "source-layer": BUILDING_SOURCE_LAYER,
        filter: BUILDING_RENDER_FILTER,
        paint: {
          "fill-color": fillColor,
          "fill-opacity": KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION
        }
      },
      beforeRoadBase
    );
  }
  if (!map.getLayer(BUILDING_OUTLINE_LAYER_ID)) {
    map.addLayer(
      {
        id: BUILDING_OUTLINE_LAYER_ID,
        type: "line",
        source: BUILDING_SOURCE_ID,
        "source-layer": BUILDING_SOURCE_LAYER,
        filter: BUILDING_RENDER_FILTER,
        paint: {
          "line-color": fillColor,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            BUILDING_TILE_MIN_ZOOM,
            0.4,
            15,
            1,
            17,
            1.6
          ],
          "line-opacity": KINGSTON_BUILDING_OUTLINE_OPACITY
        }
      },
      beforeRoadBase
    );
  }
  if (!map.getSource(BUILDING_LABEL_SOURCE_ID)) {
    map.addSource(BUILDING_LABEL_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_BUILDING_LABEL_GEOJSON
    });
  }
  if (!map.getLayer(BUILDING_LABEL_LAYER_ID)) {
    map.addLayer(
      {
        id: BUILDING_LABEL_LAYER_ID,
        type: "symbol",
        source: BUILDING_LABEL_SOURCE_ID,
        minzoom: 14,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Regular", "Open Sans Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            10,
            16,
            13,
            18,
            16
          ],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-max-width": 8,
          "text-anchor": "center",
          "text-offset": KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION
        },
        paint: {
          "text-color": labelTextColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.5,
          "text-halo-blur": 0.4
        }
      },
      beforeRoadLabel
    );
  }
  if (city === "kingston") {
    if (!map.getSource(KINGSTON_FIELD_LABEL_SOURCE_ID)) {
      map.addSource(KINGSTON_FIELD_LABEL_SOURCE_ID, {
        type: "geojson",
        data: KINGSTON_FIELD_LABEL_GEOJSON
      });
    }
    if (!map.getLayer(KINGSTON_FIELD_LABEL_LAYER_ID)) {
      map.addLayer(
        {
          id: KINGSTON_FIELD_LABEL_LAYER_ID,
          type: "symbol",
          source: KINGSTON_FIELD_LABEL_SOURCE_ID,
          minzoom: 14,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular", "Open Sans Regular"],
            "text-size": KINGSTON_FIELD_LABEL_TEXT_SIZE_EXPRESSION,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-max-width": 10,
            "text-anchor": "center"
          },
          paint: {
            "text-color": KINGSTON_FIELD_LABEL_TEXT_COLOR,
            "text-halo-color": KINGSTON_FIELD_LABEL_HALO_COLOR,
            "text-halo-width": 2,
            "text-halo-blur": 0.2
          }
        },
        beforeRoadLabel
      );
    }
  }
};
export const resetRoadSource = (map, city, initialFilter, lineColorExpression, textColorExpression, labelTextExpression) => {
  if (map.getLayer(ROAD_LABEL_LAYER_ID)) {
    map.removeLayer(ROAD_LABEL_LAYER_ID);
  }
  if (map.getLayer(ROAD_LAYER_ID)) {
    map.removeLayer(ROAD_LAYER_ID);
  }
  if (map.getLayer(ROAD_BASE_LAYER_ID)) {
    map.removeLayer(ROAD_BASE_LAYER_ID);
  }
  if (map.getSource(ROAD_SOURCE_ID)) {
    map.removeSource(ROAD_SOURCE_ID);
  }
  ensureRoadLayer(
    map,
    city,
    initialFilter,
    lineColorExpression,
    textColorExpression,
    labelTextExpression
  );
};
export const resetBuildingSource = (map, city) => {
  if (map.getLayer(KINGSTON_FIELD_LABEL_LAYER_ID)) {
    map.removeLayer(KINGSTON_FIELD_LABEL_LAYER_ID);
  }
  if (map.getLayer(BUILDING_LABEL_LAYER_ID)) {
    map.removeLayer(BUILDING_LABEL_LAYER_ID);
  }
  if (map.getLayer(BUILDING_OUTLINE_LAYER_ID)) {
    map.removeLayer(BUILDING_OUTLINE_LAYER_ID);
  }
  if (map.getLayer(BUILDING_FILL_LAYER_ID)) {
    map.removeLayer(BUILDING_FILL_LAYER_ID);
  }
  if (map.getSource(BUILDING_SOURCE_ID)) {
    map.removeSource(BUILDING_SOURCE_ID);
  }
  if (map.getSource(BUILDING_LABEL_SOURCE_ID)) {
    map.removeSource(BUILDING_LABEL_SOURCE_ID);
  }
  if (map.getSource(KINGSTON_FIELD_LABEL_SOURCE_ID)) {
    map.removeSource(KINGSTON_FIELD_LABEL_SOURCE_ID);
  }
  ensureBuildingLayer(map, city);
};
