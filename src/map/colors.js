import { toDefaultToken, ROAD_TILE_MIN_ZOOM } from "./config.js";

export const stringToColor = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
};
export const stringToPastelColor = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 80%)`;
};
export const buildBuildingLabelCanonicalExpression = (labelExpression, overrides) => {
  if (!overrides.length) return labelExpression;
  const pairs = overrides.flatMap(([fromLabel, toLabel]) => [
    fromLabel,
    toLabel
  ]);
  return [
    "match",
    labelExpression,
    ...pairs,
    labelExpression
  ];
};
export const buildBuildingColorExpression = (labelExpression, labels, fallbackColor, colorOverrides = {}) => {
  if (!labels.length) return fallbackColor;
  const colorPairs = [];
  labels.forEach((label) => {
    colorPairs.push(label, colorOverrides[label] ?? stringToPastelColor(label));
  });
  return [
    "match",
    labelExpression,
    ...colorPairs,
    fallbackColor
  ];
};
export const buildBuildingQuizColorExpression = (labelExpression, correctLabels, incorrectLabels, baseColor) => {
  if (!correctLabels.length && !incorrectLabels.length) return baseColor;
  const cases = [];
  if (incorrectLabels.length) {
    cases.push(
      ["match", labelExpression, incorrectLabels, true, false],
      QUIZ_INCORRECT_ROAD_COLOR
    );
  }
  if (correctLabels.length) {
    cases.push(
      ["match", labelExpression, correctLabels, true, false],
      QUIZ_CORRECT_ROAD_COLOR
    );
  }
  return ["case", ...cases, baseColor];
};
export const buildContrastingTextColorExpression = (colorExpr, threshold = 0.55) => {
  const rgba = ["to-rgba", ["to-color", colorExpr]];
  const r = ["at", 0, rgba];
  const g = ["at", 1, rgba];
  const b = ["at", 2, rgba];
  const luminance = [
    "+",
    ["*", 0.2126, r],
    ["*", 0.7152, g],
    ["*", 0.0722, b]
  ];
  return [
    "case",
    ["<", luminance, ["*", threshold, 255]],
    "#ffffff",
    "#111111"
  ];
};
export const DEFAULT_ROAD_COLOR = "#f28c5f";
export const QUIZ_BASE_ROAD_COLOR = "#ffffff85";
export const QUIZ_CORRECT_ROAD_COLOR = "#4fb360ff";
export const QUIZ_INCORRECT_ROAD_COLOR = "#dd5656ff";
export const BUILDING_QUIZ_ROAD_COLOR = "#b6bbc2";
export const ROAD_LABEL_SIZE_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ROAD_TILE_MIN_ZOOM,
  9,
  10,
  12,
  14,
  16
];
export const BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ROAD_TILE_MIN_ZOOM,
  7,
  10,
  10,
  14,
  13
];
export const ROAD_COLOR_OVERRIDES = {
  [toDefaultToken("Boulevard Maloney Ouest")]: "#43ffe0ff",
  [toDefaultToken("Parkdale Avenue")]: "#2563eb",
  [toDefaultToken("Bank Street")]: "#b5d2a6ff",
  [toDefaultToken("Wellington Street")]: "#d23d3dff",
  [toDefaultToken("West Hunt CLub Road")]: "#0095ffff",
  [toDefaultToken("Hazeldean Road")]: "#a22c57ff",
  [toDefaultToken("University Avenue")]: "#d66d94ff",
  [toDefaultToken("Albert Street")]: "#bfa6ecff",
  [toDefaultToken("Mack Street")]: "#5ad0b6ff",
  [toDefaultToken("Union Street")]: "#ffa16fff",
  [toDefaultToken("Queen Elizabeth Driveway")]: "#6d0978ff",
  [toDefaultToken("Terry Fox Drive")]: "#eb5c5cff",
  [toDefaultToken("174")]: "#eae685ff",
  [toDefaultToken("St. Laurent Boulevard")]: "#f78dbbff",
  [toDefaultToken("Murray Street")]: "#ff6214ff",
  [toDefaultToken("Chaudi\xE8re Bridge")]: "#b83d99ff",
  [toDefaultToken("Kichi Zibi Mikan")]: "#99d272ff",
  [toDefaultToken("MacDonald-Cartier Bridge")]: "#d69749ff",
  [toDefaultToken("Ogilvie Road")]: "#7222daff",
  [toDefaultToken("Smyth Road")]: "#c22d00ff"
};
