import { BUILDING_TILE_MIN_ZOOM } from "./config.js";
import {
  buildBuildingColorExpression,
  buildBuildingLabelCanonicalExpression
} from "./colors.js";

export const canonicalizeBuildingLabel = (label) => KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP.get(label) ?? label;
export const normalizeBuildingLabel = (label) => canonicalizeBuildingLabel(label.trim()).toLowerCase();
export const getBuildingDisplayLabel = (label) => {
  const canonicalLabel = canonicalizeBuildingLabel(label.trim());
  return KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP.get(canonicalLabel) ?? canonicalLabel;
};
export const buildingFeatureMatchesLabel = (feature, label) => {
  const properties = feature.properties ?? {};
  const targetLabel = getBuildingDisplayLabel(label);
  const labelValues = [
    properties["name"],
    properties["official_name"],
    properties["alt_name"],
    properties["operator"]
  ];
  return labelValues.some(
    (value) => typeof value === "string" && getBuildingDisplayLabel(value) === targetLabel
  );
};
export const getBuildingLabelCandidate = (feature) => {
  const properties = feature.properties ?? {};
  const labelValues = [
    properties["name"],
    properties["official_name"],
    properties["alt_name"],
    properties["operator"]
  ];
  for (const value of labelValues) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    return {
      canonicalLabel: canonicalizeBuildingLabel(trimmed),
      displayLabel: getBuildingDisplayLabel(trimmed)
    };
  }
  return null;
};
export const getRingAreaAndCentroid = (ring) => {
  if (ring.length < 3) return null;
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) return null;
  const centroid = [x / (6 * area), y / (6 * area)];
  return { area, centroid };
};
export const getPolygonAreaAndCentroid = (rings) => {
  let areaSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (const ring of rings) {
    const result = getRingAreaAndCentroid(ring);
    if (!result) continue;
    areaSum += result.area;
    xSum += result.centroid[0] * result.area;
    ySum += result.centroid[1] * result.area;
  }
  if (areaSum === 0) return null;
  const centroid = [xSum / areaSum, ySum / areaSum];
  return { area: Math.abs(areaSum), centroid };
};
export const getGeometryAreaAndCentroid = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return getPolygonAreaAndCentroid(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    let areaSum = 0;
    let xSum = 0;
    let ySum = 0;
    for (const polygon of geometry.coordinates) {
      const result = getPolygonAreaAndCentroid(polygon);
      if (!result) continue;
      areaSum += result.area;
      xSum += result.centroid[0] * result.area;
      ySum += result.centroid[1] * result.area;
    }
    if (areaSum === 0) return null;
    const centroid = [xSum / areaSum, ySum / areaSum];
    return { area: areaSum, centroid };
  }
  return null;
};
export const BUILDING_LABEL_TEXT_EXPRESSION = [
  "coalesce",
  ["get", "name"],
  ["get", "official_name"],
  ["get", "alt_name"],
  ["get", "operator"]
];
export const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES = [
  ["Bruce Wing", "Miller Hall"],
  ["Jean Royce Hall - Phase 1", "Jean Royce Hall"],
  ["Jean Royce Hall - Phase 2", "Jean Royce Hall"]
];
export const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
);
export const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES = [
  ["Beamish-Munro Hall", "Beamish-Munro Hall (ILC)"],
  ["Duncan McArthur Hall", "Duncan McArthur Hall (Faculty of Education)"],
  ["Queen's Athletics Recreation Centre", "Queen's Athletics Recreation Centre (ARC)"]
];
export const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
);
export const BUILDING_LABEL_CANONICAL_EXPRESSION = buildBuildingLabelCanonicalExpression(
  BUILDING_LABEL_TEXT_EXPRESSION,
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
);
export const BUILDING_LABEL_DISPLAY_EXPRESSION = buildBuildingLabelCanonicalExpression(
  BUILDING_LABEL_CANONICAL_EXPRESSION,
  KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
);
export const KINGSTON_BUILDING_VISIBLE_LABELS = [
  "Adelaide Hall",
  "Agnes Queen\u2019s Art Gallery",
  "Ann Baillie Building",
  "Ban Righ Hall",
  "Beamish-Munro Hall",
  "Biosciences Complex",
  "Botterell Hall",
  "Brant House",
  "Carruthers Hall",
  "Cataraqui Building",
  "Chernoff Auditorium",
  "Chernoff Hall",
  "Chown Hall",
  "Clark Hall",
  "David C. Smith House",
  "Douglas Library",
  "Duncan McArthur Hall",
  "Dunning Hall",
  "Dupuis Hall",
  "Ellis Hall",
  "Endaayaan \u2013 Tkan\xF3nsote",
  "Etherington Hall",
  "Fleming Hall",
  "Goodes Hall",
  "Goodwin Hall",
  "Gordon Hall",
  "Gordon-Brockington House",
  "Grant Hall",
  "Harkness Hall",
  "Harrison-LeCaine Hall",
  "Humphrey Hall",
  "Isabel Bader Centre for Performing Arts",
  "Jackson Hall",
  "Jeffery Hall",
  "John Deutsch University Centre",
  "Kathleen Ryan Hall",
  "Kingston Hall",
  "LaSalle Building",
  "Leggett Hall",
  "Leonard Hall",
  "Louise D. Acton Building",
  "Mackintosh-Corry Hall",
  "McLaughlin Hall",
  "McNeill House",
  "Miller Hall",
  "Mitchell Hall",
  "Morris Hall",
  "Nicol Hall",
  "Old Medical Building",
  "Ontario Hall",
  "Queen's Athletics Recreation Centre",
  "Queen's School of Medicine",
  "Richardson Hall",
  "Richardson Laboratory",
  "Rideau Building",
  "Robert Sutherland Hall",
  "Stirling Hall",
  "Summerhill",
  "The Law Building",
  "Stauffer Library",
  "Kinesiology Building",
  "Macdonald Hall",
  "Victoria Hall",
  "Walter Light Hall",
  "Watson Hall",
  "Jean Royce Hall",
  "Watts Hall",
  "Theological Hall"
];
export const KINGSTON_BUILDING_DISPLAY_LABELS = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => getBuildingDisplayLabel(label)
);
export const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => normalizeBuildingLabel(label)
);
export const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER_SET = new Set(
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER
);
export const DEFAULT_BUILDING_LABEL_OFFSET = [0, 0];
export const EMPTY_BUILDING_LABEL_GEOJSON = {
  type: "FeatureCollection",
  features: []
};
export const buildBuildingLabelFeatureCollection = (features, allowedLabels = null) => {
  if (allowedLabels && allowedLabels.size === 0) {
    return { type: "FeatureCollection", features: [] };
  }
  const labels = /* @__PURE__ */ new Map();
  for (const feature of features) {
    const labelInfo = getBuildingLabelCandidate(feature);
    if (!labelInfo) continue;
    if (allowedLabels && !allowedLabels.has(labelInfo.displayLabel)) continue;
    const normalizedLabel = normalizeBuildingLabel(labelInfo.canonicalLabel);
    if (!KINGSTON_BUILDING_VISIBLE_LABELS_LOWER_SET.has(normalizedLabel)) continue;
    const geometryInfo = getGeometryAreaAndCentroid(
      feature.geometry
    );
    if (!geometryInfo) continue;
    const existing = labels.get(normalizedLabel);
    if (!existing || geometryInfo.area > existing.area) {
      labels.set(normalizedLabel, {
        area: geometryInfo.area,
        label: labelInfo.displayLabel,
        canonicalLabel: labelInfo.canonicalLabel,
        point: geometryInfo.centroid
      });
    }
  }
  const labelFeatures = [];
  for (const entry of labels.values()) {
    const labelOffset = DEFAULT_BUILDING_LABEL_OFFSET;
    labelFeatures.push({
      type: "Feature",
      properties: {
        label: entry.label,
        canonical_label: entry.canonicalLabel,
        label_offset: labelOffset
      },
      geometry: { type: "Point", coordinates: entry.point }
    });
  }
  return { type: "FeatureCollection", features: labelFeatures };
};
export const KINGSTON_BUILDING_FALLBACK_COLOR = "#d8e4ef";
export const KINGSTON_BUILDING_QUIZ_BASE_COLOR = "#b8c0c7";
export const KINGSTON_BUILDING_ROAD_QUIZ_COLOR = "#f2f2f2";
export const KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR = "#ffffff";
export const KINGSTON_BUILDING_COLOR_OVERRIDES = {
  "Leonard Hall": "#a2f0e9",
  "Walter Light Hall": "#c18772",
  "Stauffer Library": "#827cc4"
};
export const KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.35,
  15,
  0.55,
  17,
  0.7
];
export const KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.15,
  15,
  0.24,
  17,
  0.32
];
export const KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.32,
  15,
  0.5,
  17,
  0.65
];
export const KINGSTON_BUILDING_OUTLINE_OPACITY = 0.9;
export const KINGSTON_BUILDING_COLOR_EXPRESSION = buildBuildingColorExpression(
  BUILDING_LABEL_CANONICAL_EXPRESSION,
  KINGSTON_BUILDING_VISIBLE_LABELS,
  KINGSTON_BUILDING_FALLBACK_COLOR,
  KINGSTON_BUILDING_COLOR_OVERRIDES
);
export const KINGSTON_BUILDING_VISIBLE_FILTER = [
  "match",
  ["downcase", BUILDING_LABEL_CANONICAL_EXPRESSION],
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER,
  true,
  false
];
export const BUILDING_RENDER_FILTER = [
  "all",
  ["!=", ["get", "building"], "parking"],
  ["!=", ["get", "building"], "garage"],
  KINGSTON_BUILDING_VISIBLE_FILTER
];
export const KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION = [
  "coalesce",
  ["get", "label_offset"],
  ["literal", [0, 0]]
];
export const KINGSTON_BUILDING_LABEL_COLOR = "#000000";
export const KINGSTON_BUILDING_LABEL_HALO_COLOR = buildBuildingColorExpression(
  ["get", "canonical_label"],
  KINGSTON_BUILDING_VISIBLE_LABELS,
  KINGSTON_BUILDING_FALLBACK_COLOR,
  KINGSTON_BUILDING_COLOR_OVERRIDES
);
export const KINGSTON_FIELD_LABEL_TEXT_COLOR = "#000000";
export const KINGSTON_FIELD_LABEL_HALO_COLOR = "#ffffff";
export const KINGSTON_FIELD_LABEL_TEXT_SIZE_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  14,
  11,
  16,
  14,
  18,
  16
];
export const KINGSTON_FIELD_LABEL_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Richardson Stadium" },
      geometry: { type: "Point", coordinates: [-76.516296, 44.227681] }
    },
    {
      type: "Feature",
      properties: { name: "Nixon Field" },
      geometry: { type: "Point", coordinates: [-76.49464, 44.225158] }
    },
    {
      type: "Feature",
      properties: { name: "Tindall Field" },
      geometry: { type: "Point", coordinates: [-76.498144, 44.226704] }
    }
  ]
};
