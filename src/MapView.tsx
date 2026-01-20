import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type MapLibreEvent,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type MapSourceDataEvent,
} from "maplibre-gl";

type CityKey = "ottawa" | "montreal" | "kingston";
type CityConfig = {
  label: string;
  selectLabel?: string;
  center: [number, number];
  zoom: number;
  tileBounds: [number, number, number, number];
  mapBounds: [number, number, number, number];
  tilePath: string;
  buildingTilePath?: string;
  catalogPath: string;
  tagline: string;
  defaultTokens: string[];
};
type QuizResultState = "idle" | "correct" | "incorrect";

const DEFAULT_CITY: CityKey = "ottawa";

const BASE_TILE_SIZE = 256;
const getRasterScale = () => {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio > 1 ? 2 : 1;
};
const buildRasterStyle = (scale: number) => {
  const scaleParam = scale > 1 ? `&scale=${scale}` : "";
  return {
    version: 8,
    sources: {
      googleSat: {
        type: "raster",
        tiles: [
          `https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}${scaleParam}`,
          `https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}${scaleParam}`,
          `https://mt2.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}${scaleParam}`,
          `https://mt3.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}${scaleParam}`,
        ],
        tileSize: BASE_TILE_SIZE * scale,
        attribution: "Satellite Imagery by © Google // Coded by Julien Chagnon",
      },
    },
    layers: [
      {
        id: "base",
        type: "raster",
        source: "googleSat",
        paint: { "raster-opacity": 1 },
      },
    ],
  };
};

const ROAD_SOURCE_ID = "roads-source";
const ROAD_BASE_LAYER_ID = "roads-base";
const ROAD_LAYER_ID = "roads-line";
const ROAD_LABEL_LAYER_ID = "roads-label";
const ROAD_SOURCE_LAYER = "roads";
const ROAD_TILE_MIN_ZOOM = 2;
const ROAD_TILE_MAX_ZOOM = 14;

const BUILDING_SOURCE_ID = "buildings-source";
const BUILDING_FILL_LAYER_ID = "buildings-fill";
const BUILDING_OUTLINE_LAYER_ID = "buildings-outline";
const BUILDING_LABEL_SOURCE_ID = "buildings-label-source";
const BUILDING_LABEL_LAYER_ID = "buildings-label";
const BUILDING_SOURCE_LAYER = "buildings";
const BUILDING_TILE_MIN_ZOOM = 12;
const BUILDING_TILE_MAX_ZOOM = 16;
const KINGSTON_FIELD_LABEL_SOURCE_ID = "kingston-field-labels-source";
const KINGSTON_FIELD_LABEL_LAYER_ID = "kingston-field-labels";

// --- Popular Roads Data ---
const POPULAR_ROADS_OTTAWA = [
  "Carling Avenue", "Hunt Club Road", "West Hunt Club Road", "Somerset Street West", "Bank Street", "Rideau Street",
  "Elgin Street", "Laurier Avenue", "Laurier Avenue West", "Wellington Street", "Bronson Avenue", "Baseline Road",
  "Merivale Road", "Woodroffe Avenue", "Greenbank Road", "Fisher Avenue",
  "Riverside Drive", "St. Laurent Boulevard", "Montreal Road", "Innes Road", "Blair Road", "Prince of Wales Drive", "Heron Road", "Main Street",
  "Lees Avenue", "King Edward Avenue", "Nicholas Street", "Scott Street", "Ogilvie Road",
  "Richmond Road", "Island Park Drive", "Parkdale Avenue", "Terry Fox Drive", "March Road",
  "Kichi Zibi Mikan",
  "Boulevard des Allumettières", "Boulevard Maloney Ouest", "Boulevard Maisonneuve",
  "Alexandra Bridge", "Champlain Bridge", "Chaudière Bridge",
  "Macdonald-Cartier Bridge", "Portage Bridge",
  "Hazeldean Road", "Eagleson Road", "Campeau Drive", "Kanata Avenue",
  "Robertson Road", "Moodie Drive", "Fallowfield Road", "Strandherd Drive", "Leitrim Road",
  "Tenth Line Road", "Walkley Road", "Promenade Vanier Parkway", "Industrial Avenue", "Colonel By Drive",
  "Queen Elizabeth Driveway", "Sussex Drive", "George Street", "York Street", "Clarence Street",
  "Dalhousie Street", "Slater Street", "Albert Street",
  "Metcalfe Street", "O'Connor Street", "Booth Street",
  "Wellington Street West", "Maitland Avenue", "Gladstone Avenue", "St. Joseph Boulevard",
  "Jeanne D'Arc Boulevard", "Aviation Parkway", "Sir-George-\u00c9tienne-Cartier Parkway",
  "St. Patrick Street", "Murray Street", "Smyth Road", "Palladium Drive", "Castlefrank Road", 
  "Rochester Street", "Kent Street", "Lyon Street", "Airport Parkway", "Queen Street"
];

const POPULAR_ROADS_MONTREAL = [
  "Route du Fleuve (Route 138)",

  // Ponts / tunnel structurants
  "Pont Champlain",
  "Pont Jacques-Cartier",
  "Tunnel Louis-Hippolyte-La Fontaine",
  "Pont Honoré-Mercier",

  // Centre-ville / Ville-Marie
  "Rue Sainte-Catherine Ouest",
  "Rue Sainte-Catherine Est",
  "Boulevard René-Lévesque Ouest",
  "Boulevard René-Lévesque Est",
  "Rue Sherbrooke Ouest",
  "Rue Sherbrooke Est",
  "Boulevard De Maisonneuve Ouest",
  "Boulevard De Maisonneuve Est",
  "Rue Notre-Dame Ouest",
  "Rue Notre-Dame Est",
  "Boulevard Saint-Laurent",
  "Rue Saint-Denis",
  "Chemin de la Côte-des-Neiges",
  "Boulevard Robert-Bourassa",

  // Grands axes N–S / E–O (île de Montréal)
  "Boulevard Décarie",
  "Boulevard Pie-IX",
  "Boulevard Saint-Michel",
  "Boulevard Lacordaire",
  "Boulevard Langelier",

  // Grandes artères montréalaises
  "Boulevard Jean-Talon Ouest",
  "Boulevard Jean-Talon Est",
  "Boulevard Henri-Bourassa Ouest",
  "Boulevard Henri-Bourassa Est",
  "Boulevard Crémazie",
  "Boulevard Métropolitain",

  // Laval
  "Boulevard Curé-Labelle",
  "Boulevard des Laurentides",
  "Boulevard Saint-Martin Ouest",
  "Boulevard Saint-Martin Est",

  // Longueuil / Rive-Sud
  "Boulevard Taschereau",
  "Boulevard Marie-Victorin",
  "Chemin de Chambly",
  "Boulevard Lapinière"
];

const POPULAR_ROADS_KINGSTON = [
  "Albert Street",
  "Frontenac Street",
  "Alfred Street",
  "University Avenue",
  "Aberdeen Street",
  "Division Street",
  "Princess Street",
  "Johnson Street",
  "Bagot Street",
  "Barrie Street",
  "Queen Street",
  "King Street",
  "Mack Street",
  "Nelson Street",
  "Earl Street",
  "Union Street",
  "Arch Street",
  "Stuart Street",
  "Brock Street",
  "William Street",
  "Collingwood Street",
  "Clergy Street",
  "Bader Lane"
];

const POPULAR_ROAD_REFS_OTTAWA = ["417", "416", "174", "50", "5"];
const POPULAR_ROAD_REFS_MONTREAL = ["Autoroute Bonaventure (A-10)",
  "Autoroute Chomedey (A-13)",
  "Autoroute Décarie (A-15)",
  "Autoroute Jean-Lesage (A-20)",
  "Autoroute Louis-Hippolyte-La Fontaine (A-25)",
  "Autoroute de la Montérégie (A-30)",
  "Autoroute Félix-Leclerc (A-40)",
  "Route de la Vallée-du-Richelieu (Route 116)",
  "Route Marie-Victorin (Route 132)"];

const POPULAR_ROADS_BY_CITY: Record<CityKey, string[]> = {
  ottawa: POPULAR_ROADS_OTTAWA,
  montreal: POPULAR_ROADS_MONTREAL,
  kingston: POPULAR_ROADS_KINGSTON,
};

const POPULAR_ROAD_REFS_BY_CITY: Record<CityKey, string[]> = {
  ottawa: POPULAR_ROAD_REFS_OTTAWA,
  montreal: POPULAR_ROAD_REFS_MONTREAL,
  kingston: [],
};

const ALL_POPULAR_ROADS = [
  ...POPULAR_ROADS_BY_CITY.ottawa,
  ...POPULAR_ROADS_BY_CITY.montreal,
];

const toDefaultToken = (value: string) => value.trim().toLowerCase();
const POPULAR_ROAD_NAME_SET = new Set(
  ALL_POPULAR_ROADS.map((name) => toDefaultToken(name))
);

// Streets that are common downtown but often tagged as residential/unclassified in OSM.
// These should NOT be restricted by MAJOR_HIGHWAY_FILTER.
const RESIDENTIAL_DEFAULT_POPULAR_ROADS = [
  "George Street",
  "York Street",
  "Clarence Street",
  "St. Patrick Street",
  "Albert Street",
  "Boulevard des Allumettières",
  "Boulevard Alexandre-Taché",
  "Boulevard Maisonneuve",
];

const RESIDENTIAL_POPULAR_ROAD_NAME_SET = new Set(
  RESIDENTIAL_DEFAULT_POPULAR_ROADS.map((name) => toDefaultToken(name))
);
const MONTREAL_REF_LABEL_OVERRIDES = new Map<string, string>(
  [
    ["10", "Autoroute Bonaventure (A-10)"],
    ["13", "Autoroute Chomedey (A-13)"],
    ["15", "Autoroute Décarie (A-15)"],
    ["20", "Autoroute Jean-Lesage (A-20)"],
    ["25", "Autoroute Louis-Hippolyte-La Fontaine (A-25)"],
    ["30", "Autoroute de la Montérégie (A-30)"],
    ["40", "Autoroute Félix-Leclerc (A-40)"],
    ["116", "Route de la Vallée-du-Richelieu (Route 116)"],
    ["132", "Route Marie-Victorin (Route 132)"],
    ["138", "Route du Fleuve (Route 138)"],
    ["117", "Route du Nord (Route 117)"],
  ].map(([ref, label]) => [toDefaultToken(ref), label] as const)
);
const OTTAWA_REF_LABEL_OVERRIDES = new Map<string, string>(
  [
    ["50", "50"],
    ["5", "Avenue de la Gatineau (A5)"],
  ].map(([ref, label]) => [toDefaultToken(ref), label] as const)
);
const OTTAWA_REF_LABEL_EXCLUSIONS = new Map<string, Set<string>>([
  [
    toDefaultToken("5"),
    new Set(
      [
        "Macdonald-Cartier Bridge",
        "Pont Macdonald-Cartier Bridge",
        "Stittsville Main Street",
        "Huntley Road",
        "Carp Road"
      ].map((name) => toDefaultToken(name))
    ),
  ],
  [
    toDefaultToken("50"),
    new Set(
      ["Coventry Road", "Coventry Rd", "Ogilvie Road", "Ogilvie Rd"].map((name) =>
        toDefaultToken(name)
      )
    ),
  ],
]);
const OTTAWA_ALIAS_TOKEN_BY_VALUE = new Map<string, string>(
  [
    ["bd alexandre tache", "boulevard alexandre-taché"],
    ["bd alexandre-tache", "boulevard alexandre-taché"],
    ["bd alexandre taché", "boulevard alexandre-taché"],
    ["bd alexandre-taché", "boulevard alexandre-taché"],
    ["bd des allumetieres", "boulevard des allumettières"],
    ["bd des allumettieres", "boulevard des allumettières"],
    ["bd des allumettières", "boulevard des allumettières"],
    ["boulevard des allumetieres", "boulevard des allumettières"],
  ].map(([alias, token]) => [toDefaultToken(alias), toDefaultToken(token)] as const)
);
const OTTAWA_HIGHWAY_REF_TOKENS = new Set(
  ["50", "5"].map((ref) => toDefaultToken(ref))
);
const OTTAWA_NAME_LABEL_OVERRIDES = new Map<string, string>(
  [
    ["Pont Alexandra", "Alexandra Bridge"],
    ["Pont Champlain Bridge", "Champlain Bridge"],
    ["Pont Macdonald-Cartier Bridge", "Macdonald-Cartier Bridge"],
    ["Pont du Portage", "Portage Bridge"],
    ["Pont du Portage Bridge", "Portage Bridge"],
    ["Pont de la Chaudière", "Chaudière Bridge"],
    ["Boulevard Maloney Ouest", "Boulevard Maloney O"],
  ].map(([name, label]) => [toDefaultToken(name), label] as const)
);
const KINGSTON_NAME_LABEL_OVERRIDES = new Map<string, string>(
  [
    ["King Street", "King Street"],
    ["King Street East", "King Street"],
    ["King Street West", "King Street"],
  ].map(([name, label]) => [toDefaultToken(name), label] as const)
);

const buildDefaultRoadTokens = (names: string[], refs: string[]) => [
  ...names.map((name) => toDefaultToken(name)),
  ...refs.map((ref) => toDefaultToken(ref)),
];

const DEFAULT_ROAD_TOKENS_BY_CITY: Record<CityKey, string[]> = {
  ottawa: buildDefaultRoadTokens(
    POPULAR_ROADS_BY_CITY.ottawa,
    POPULAR_ROAD_REFS_BY_CITY.ottawa
  ),
  montreal: buildDefaultRoadTokens(
    POPULAR_ROADS_BY_CITY.montreal,
    POPULAR_ROAD_REFS_BY_CITY.montreal
  ),
  kingston: buildDefaultRoadTokens(
    POPULAR_ROADS_BY_CITY.kingston,
    POPULAR_ROAD_REFS_BY_CITY.kingston
  ),
};

const OTTAWA_TILE_BOUNDS: [number, number, number, number] = [
  -76.046145,
  45.179021,
  -75.368409,
  45.57046,
];
const MONTREAL_TILE_BOUNDS: [number, number, number, number] = [
  -73.953278,
  45.394652,
  -73.353682,
  45.697687,
];
const KINGSTON_TILE_BOUNDS: [number, number, number, number] = [
  -76.528833,
  44.217435,
  -76.471204,
  44.25584,
];
const KINGSTON_CENTER_OFFSET: [number, number] = [0.006, -0.011];
const KINGSTON_CAMPUS_CENTER: [number, number] = [-76.495056, 44.22626];
const KINGSTON_CAMPUS_ZOOM = 15.5;
const KINGSTON_CAMPUS_MOBILE_ZOOM = 14.8;
const buildMapBounds = (
  bounds: [number, number, number, number],
  padX = 0.8,
  padY = 0.4
): [number, number, number, number] => [
  bounds[0] - padX,
  bounds[1] - padY,
  bounds[2] + padX,
  bounds[3] + padY,
];
const buildBoundsCenter = (
  bounds: [number, number, number, number]
): [number, number] => [
  (bounds[0] + bounds[2]) / 2,
  (bounds[1] + bounds[3]) / 2,
];
const getQuizResultDuration = () => {
  if (typeof window === "undefined") return 500;
  return window.matchMedia("(max-width: 900px)").matches ? 700 : 500;
};
const getKingstonCampusZoom = () => {
  if (typeof window === "undefined") return KINGSTON_CAMPUS_ZOOM;
  return window.matchMedia("(max-width: 900px)").matches
    ? KINGSTON_CAMPUS_MOBILE_ZOOM
    : KINGSTON_CAMPUS_ZOOM;
};


const CITY_CONFIG: Record<CityKey, CityConfig> = {
  ottawa: {
    label: "Ottawa/Gatineau",
    selectLabel: "Ottawa",
    center: buildBoundsCenter(OTTAWA_TILE_BOUNDS),
    zoom: 11.5,
    tileBounds: OTTAWA_TILE_BOUNDS,
    mapBounds: buildMapBounds(OTTAWA_TILE_BOUNDS),
    tilePath: "assets/tiles/ottawa/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/ottawa.json",
    tagline: "Memorize high traffic roads in Canada's Capital.",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.ottawa,
  },
  montreal: {
    label: "Montreal",
    center: buildBoundsCenter(MONTREAL_TILE_BOUNDS),
    zoom: 11.5,
    tileBounds: MONTREAL_TILE_BOUNDS,
    mapBounds: buildMapBounds(MONTREAL_TILE_BOUNDS),
    tilePath: "assets/tiles/montreal/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/montreal.json",
    tagline: "Memorize high traffic roads in Montreal.",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.montreal,
  },
  kingston: {
    label: "Queen's University",
    selectLabel: "Kingston (Queen's University)",
    center: [
      buildBoundsCenter(KINGSTON_TILE_BOUNDS)[0] + KINGSTON_CENTER_OFFSET[0],
      buildBoundsCenter(KINGSTON_TILE_BOUNDS)[1] + KINGSTON_CENTER_OFFSET[1],
    ],
    zoom: 13.4,
    tileBounds: KINGSTON_TILE_BOUNDS,
    mapBounds: buildMapBounds(KINGSTON_TILE_BOUNDS),
    tilePath: "assets/tiles/kingston/{z}/{x}/{y}.pbf",
    buildingTilePath: "assets/tiles/kingston/buildings/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/kingston.json",
    tagline: "Memorize key streets and buildings around Queen's University.",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.kingston,
  },
};

const resolveStaticUrl = (path: string) => {
  if (typeof window === "undefined") return path;

  // BASE_URL is safe to feed into URL(); it won't contain {z}/{x}/{y}
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const baseHref = base.href.endsWith("/") ? base.href : `${base.href}/`;

  // IMPORTANT: string concat preserves {z}/{x}/{y} (URL() would encode braces)
  return `${baseHref}${path.replace(/^\/+/, "")}`;
};

const getRoadTileUrl = (city: CityKey) => resolveStaticUrl(CITY_CONFIG[city].tilePath);
const getRoadCatalogUrl = (city: CityKey) => resolveStaticUrl(CITY_CONFIG[city].catalogPath);
const getBuildingTileUrl = (city: CityKey) => {
  const path = CITY_CONFIG[city].buildingTilePath;
  return path ? resolveStaticUrl(path) : null;
};
const QUIZ_PATH_SEGMENT = "quiz";
const BUILDINGS_PATH_SEGMENT = "buildings";
const ROUTE_HASH_PREFIX = "#/";
const CITY_PATH_SEGMENTS: Record<CityKey, string> = {
  ottawa: "ottawa",
  montreal: "montreal",
  kingston: "queens",
};
const CITY_PATH_ALIASES: Record<CityKey, string[]> = {
  ottawa: ["", "ottawa"],
  montreal: ["montreal"],
  kingston: ["queens", "kingston_queens_university", "kingston"],
};
const getBasePathname = () => {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
};
const getRoutePathname = () => {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash;
  if (hash.startsWith(ROUTE_HASH_PREFIX)) {
    const path = hash.slice(ROUTE_HASH_PREFIX.length);
    return `/${path.replace(/^\/+/, "")}`;
  }
  if (hash.startsWith("#")) {
    const path = hash.slice(1);
    return path.startsWith("/") ? path : `/${path}`;
  }
  return window.location.pathname;
};
const normalizePathname = (path: string) =>
  path.endsWith("/") ? path : `${path}/`;
const getPathSegments = (pathname: string) => {
  const basePath = normalizePathname(getBasePathname()).toLowerCase();
  let normalized = normalizePathname(pathname).toLowerCase();
  if (normalized.startsWith(basePath)) {
    normalized = normalized.slice(basePath.length);
  }
  const trimmed = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? trimmed.split("/") : [];
};
const getCityFromPathname = (pathname: string): CityKey => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return DEFAULT_CITY;
  if (segments[0] === QUIZ_PATH_SEGMENT) return DEFAULT_CITY;
  for (const [city, aliases] of Object.entries(CITY_PATH_ALIASES)) {
    if (aliases.includes(segments[0])) {
      return city as CityKey;
    }
  }
  return DEFAULT_CITY;
};
const getQuizFromPathname = (pathname: string) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(QUIZ_PATH_SEGMENT);
};
const getBuildingQuizFromPathname = (pathname: string) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(BUILDINGS_PATH_SEGMENT);
};

// --- Color Helpers ---
const stringToColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
};

const stringToPastelColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 80%)`;
};

const buildBuildingLabelCanonicalExpression = (
  labelExpression: ExpressionSpecification,
  overrides: Array<[string, string]>
): ExpressionSpecification => {
  if (!overrides.length) return labelExpression;
  const pairs = overrides.flatMap(([fromLabel, toLabel]) => [
    fromLabel,
    toLabel,
  ]);
  return [
    "match",
    labelExpression,
    ...pairs,
    labelExpression,
  ] as ExpressionSpecification;
};

const buildBuildingColorExpression = (
  labelExpression: ExpressionSpecification,
  labels: string[],
  fallbackColor: string,
  colorOverrides: Record<string, string> = {}
): ExpressionSpecification | string => {
  if (!labels.length) return fallbackColor;
  const colorPairs: Array<ExpressionSpecification | string> = [];
  labels.forEach((label) => {
    colorPairs.push(label, colorOverrides[label] ?? stringToPastelColor(label));
  });
  return [
    "match",
    labelExpression,
    ...colorPairs,
    fallbackColor,
  ] as ExpressionSpecification;
};

const buildBuildingQuizColorExpression = (
  labelExpression: ExpressionSpecification,
  correctLabels: string[],
  incorrectLabels: string[],
  baseColor: ExpressionSpecification | string
): ExpressionSpecification | string => {
  if (!correctLabels.length && !incorrectLabels.length) return baseColor;
  const cases: Array<ExpressionSpecification | string> = [];
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
  return ["case", ...cases, baseColor] as ExpressionSpecification;
};



// Build a contrasting text color from a (possibly dynamic) MapLibre color expression.
// Uses relative luminance approximation on RGB components.
const buildContrastingTextColorExpression = (
  colorExpr: ExpressionSpecification | string,
  threshold: number = 0.55
): ExpressionSpecification => {
  const rgba: ExpressionSpecification = ["to-rgba", ["to-color", colorExpr]];
  const r: ExpressionSpecification = ["at", 0, rgba];
  const g: ExpressionSpecification = ["at", 1, rgba];
  const b: ExpressionSpecification = ["at", 2, rgba];

  // luminance in [0,255]
  const luminance: ExpressionSpecification = [
    "+",
    ["*", 0.2126, r],
    ["*", 0.7152, g],
    ["*", 0.0722, b],
  ];

  // If background is dark -> white text, else -> near-black text
  return [
    "case",
    ["<", luminance, ["*", threshold, 255]],
    "#ffffff",
    "#111111",
  ] as ExpressionSpecification;
};


const DEFAULT_ROAD_COLOR = "#f28c5f";
const QUIZ_BASE_ROAD_COLOR = "#ffffff85";
const QUIZ_CORRECT_ROAD_COLOR = "#4fb360ff";
const QUIZ_INCORRECT_ROAD_COLOR = "#dd5656ff";
const BUILDING_QUIZ_ROAD_COLOR = "#b6bbc2";
const ROAD_LABEL_SIZE_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ROAD_TILE_MIN_ZOOM,
  9,
  10,
  12,
  14,
  16,
];
const BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  ROAD_TILE_MIN_ZOOM,
  7,
  10,
  10,
  14,
  13,
];


const ROAD_COLOR_OVERRIDES: Record<string, string> = {
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
  [toDefaultToken("Chaudière Bridge")]: "#b83d99ff",
  [toDefaultToken("Kichi Zibi Mikan")]: "#99d272ff",
  [toDefaultToken("MacDonald-Cartier Bridge")]: "#d69749ff",
  [toDefaultToken("Ogilvie Road")]: "#7222daff",
  [toDefaultToken("Smyth Road")]: "#c22d00ff",
};


// --- Expressions ---
const ROAD_NAME_GETTER: ExpressionSpecification = [
  "coalesce", 
  ["get", "name:en"], 
  ["get", "name"],    
  ["get", "name_en"], 
  ""
];

const ROAD_NAME_EXPRESSION: ExpressionSpecification = ["downcase", ROAD_NAME_GETTER];
const ROAD_PRIMARY_NAME_EXPRESSION: ExpressionSpecification = [
  "downcase",
  ["coalesce", ["get", "name"], ""],
];
const ROAD_ALT_NAME_EXPRESSION: ExpressionSpecification = [
  "downcase",
  ["coalesce", ["get", "name:en"], ["get", "name_en"], ""],
];
const ROAD_NAME_EXPRESSIONS: ExpressionSpecification[] = [
  ROAD_PRIMARY_NAME_EXPRESSION, // "name"
  ROAD_ALT_NAME_EXPRESSION,     // "name:en" / "name_en"
];

const buildAnyNameInExpression = (names: string[]) =>
  ([
    "any",
    ...ROAD_NAME_EXPRESSIONS.map(
      (expr) => ["in", expr, ["literal", names]] as ExpressionSpecification
    ),
  ] as ExpressionSpecification);

const buildRefMatchExpression = (refs: string[]) => {
  if (!refs.length) return null;
  const refFilters: ExpressionSpecification[] = [];
  const plainRefs: string[] = [];

  for (const ref of refs) {
    const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    if (!exclusions?.size) {
      plainRefs.push(ref);
      continue;
    }
    refFilters.push([
      "all",
      ["in", ROAD_REF_EXPRESSION, ["literal", [ref]]],
      ["!", buildAnyNameInExpression(Array.from(exclusions))],
    ] as ExpressionSpecification);
  }

  if (plainRefs.length) {
    refFilters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", plainRefs],
    ] as ExpressionSpecification);
  }

  if (!refFilters.length) return null;
  return refFilters.length === 1
    ? refFilters[0]
    : (["any", ...refFilters] as ExpressionSpecification);
};
const ROAD_REF_EXPRESSION: ExpressionSpecification = [
  "downcase",
  ["coalesce", ["get", "ref"], ""],
];

const MAIN_STREET_TOKEN = "main street";
const BOOTH_STREET_TOKEN = toDefaultToken("Booth Street");
const CHAUDIERE_BRIDGE_LABEL = "Chaudière Bridge";
const RUE_CLARENCE_TOKEN = toDefaultToken("Rue Clarence");
const MAIN_STREET_DOWNTOWN_BOUNDS: [number, number, number, number] = [
  -75.72,
  45.39,
  -75.64,
  45.44,
];
const boundsToPolygon = (
  bounds: [number, number, number, number]
): GeoJSON.Polygon => ({
  type: "Polygon",
  coordinates: [
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[1]],
      [bounds[2], bounds[3]],
      [bounds[0], bounds[3]],
      [bounds[0], bounds[1]],
    ],
  ],
});
const MAIN_STREET_DOWNTOWN_POLYGON = boundsToPolygon(
  MAIN_STREET_DOWNTOWN_BOUNDS
);
const CHAUDIERE_BRIDGE_BOUNDS: [number, number, number, number] = [
  -75.7202,
  45.4199,
  -75.7177,
  45.4226,
];
const CHAUDIERE_BRIDGE_POLYGON = boundsToPolygon(CHAUDIERE_BRIDGE_BOUNDS);
const MAIN_STREET_DOWNTOWN_FILTER: FilterSpecification = [
  "any",
  ["!=", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
  [
    "all",
    ["==", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
    ["within", MAIN_STREET_DOWNTOWN_POLYGON],
  ],
];
const CHAUDIERE_BRIDGE_OVERRIDE_MATCH: ExpressionSpecification = [
  "all",
  ["within", CHAUDIERE_BRIDGE_POLYGON],
  ["==", ROAD_NAME_EXPRESSION, BOOTH_STREET_TOKEN],
];
const CHAUDIERE_BRIDGE_OVERRIDE_FILTER =
  CHAUDIERE_BRIDGE_OVERRIDE_MATCH as FilterSpecification;
const RUE_CLARENCE_EXCLUDE_FILTER: FilterSpecification = [
  "all",
  ["!=", ROAD_PRIMARY_NAME_EXPRESSION, RUE_CLARENCE_TOKEN],
  ["!=", ROAD_ALT_NAME_EXPRESSION, RUE_CLARENCE_TOKEN],
];
const GATINEAU_ROAD_NAME_TOKENS = [
  "Boulevard Alexandre-Taché",
  "Boulevard Alexandre-Tache",
  "Boulevard Alexandre Tache",
  "Boulevard des Allumettières",
  "Boulevard des Allumetieres",
  "Boulevard Maloney Ouest",
  "Boulevard Maloney O",
  "Boulevard Maisonneuve",
  "Boulevard de Maisonneuve",
  "Maisonneuve Street",
].map((name) => toDefaultToken(name));
const GATINEAU_ROAD_REF_TOKENS = ["5", "50"].map((ref) =>
  toDefaultToken(ref)
);
const GATINEAU_ROAD_TOKEN_SET = new Set([
  ...GATINEAU_ROAD_NAME_TOKENS,
  ...GATINEAU_ROAD_REF_TOKENS,
]);
const GATINEAU_EXEMPT_NAME_TOKENS = [
  "Macdonald-Cartier Bridge",
  "Pont Macdonald-Cartier Bridge",
  "Coventry Road",
  "Coventry Rd",
  "Ogilvie Road",
  "Ogilvie Rd",
].map((name) => toDefaultToken(name));
const GATINEAU_EXEMPT_NAME_FILTER = ([
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_EXEMPT_NAME_TOKENS]]
  ),
] as unknown) as FilterSpecification;
const GATINEAU_ROAD_NAME_FILTER = ([
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_ROAD_NAME_TOKENS]]
  ),
] as unknown) as FilterSpecification;
const GATINEAU_ROAD_REF_VALUE_EXPRESSION: ExpressionSpecification = [
  "concat",
  ";",
  ROAD_REF_EXPRESSION,
  ";",
];
const GATINEAU_ROAD_REF_FILTER = ([
  "all",
  [
    "any",
    ...GATINEAU_ROAD_REF_TOKENS.map(
      (ref) => ["in", `;${ref};`, GATINEAU_ROAD_REF_VALUE_EXPRESSION]
    ),
  ],
  ["!", GATINEAU_EXEMPT_NAME_FILTER],
] as unknown) as FilterSpecification;
const GATINEAU_ROADS_EXCLUDE_FILTER = ([
  "!",
  [
    "any",
    GATINEAU_ROAD_NAME_FILTER,
    GATINEAU_ROAD_REF_FILTER,
  ],
] as unknown) as FilterSpecification;


// Label Text
const ROAD_LABEL_TEXT_EXPRESSION: ExpressionSpecification = [
  "coalesce",
  ["get", "name"], 
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "ref"],
  ""
];
const ROAD_LABEL_TEXT_EXPRESSION_EN_FIRST: ExpressionSpecification = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name"],
  ["get", "ref"],
  ""
];

const buildOttawaLabelTextExpression = (
  useChaudiereOverride: boolean
): ExpressionSpecification => {
  let baseExpression: ExpressionSpecification = ROAD_LABEL_TEXT_EXPRESSION_EN_FIRST;
  if (OTTAWA_NAME_LABEL_OVERRIDES.size) {
    const cases: Array<ExpressionSpecification | string> = [];
    for (const [name, label] of OTTAWA_NAME_LABEL_OVERRIDES) {
      cases.push(["==", ROAD_NAME_EXPRESSION, name] as ExpressionSpecification, label);
    }
    baseExpression = ["case", ...cases, baseExpression] as ExpressionSpecification;
  }
  if (!useChaudiereOverride) {
    if (!OTTAWA_REF_LABEL_OVERRIDES.size) {
      return baseExpression;
    }
    const refValue: ExpressionSpecification = [
      "concat",
      ";",
      ["downcase", ["coalesce", ["get", "ref"], ""]],
      ";",
    ];
    const cases: Array<ExpressionSpecification | string> = [];
    for (const [ref, label] of OTTAWA_REF_LABEL_OVERRIDES) {
      const excludedNames = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
      const baseMatch: ExpressionSpecification = [
        "in",
        `;${ref};`,
        refValue,
      ];
      const match = excludedNames?.size
        ? ([
            "all",
            baseMatch,
            ["!", buildAnyNameInExpression(Array.from(excludedNames))],
          ] as ExpressionSpecification)
        : baseMatch;
      cases.push(match, label);
    }
    return ["case", ...cases, baseExpression] as ExpressionSpecification;
  }
  let labeledExpression: ExpressionSpecification = [
    "case",
    CHAUDIERE_BRIDGE_OVERRIDE_MATCH,
    CHAUDIERE_BRIDGE_LABEL,
    baseExpression,
  ] as ExpressionSpecification;
  if (!OTTAWA_REF_LABEL_OVERRIDES.size) {
    return labeledExpression;
  }
  const refValue: ExpressionSpecification = [
    "concat",
    ";",
    ["downcase", ["coalesce", ["get", "ref"], ""]],
    ";",
  ];
  const cases: Array<ExpressionSpecification | string> = [];
  for (const [ref, label] of OTTAWA_REF_LABEL_OVERRIDES) {
    const excludedNames = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    const baseMatch: ExpressionSpecification = ["in", `;${ref};`, refValue];
    const match = excludedNames?.size
      ? ([
          "all",
          baseMatch,
          ["!", buildAnyNameInExpression(Array.from(excludedNames))],
        ] as ExpressionSpecification)
      : baseMatch;
    cases.push(match, label);
  }
  labeledExpression = ["case", ...cases, labeledExpression] as ExpressionSpecification;
  return labeledExpression;
};

const buildMontrealLabelTextExpression = (): ExpressionSpecification => {
  if (!MONTREAL_REF_LABEL_OVERRIDES.size) {
    return ROAD_LABEL_TEXT_EXPRESSION;
  }
  const refValue: ExpressionSpecification = [
    "concat",
    ";",
    ["downcase", ["coalesce", ["get", "ref"], ""]],
    ";",
  ];
  const cases: Array<ExpressionSpecification | string> = [];
  for (const [ref, label] of MONTREAL_REF_LABEL_OVERRIDES) {
    cases.push(["in", `;${ref};`, refValue] as ExpressionSpecification, label);
  }
  return ["case", ...cases, ROAD_LABEL_TEXT_EXPRESSION] as ExpressionSpecification;
};

const buildRoadLabelTextExpression = (
  city: CityKey,
  options?: { useChaudiereBridgeOverride?: boolean }
): ExpressionSpecification => {
  if (city === "ottawa") {
    return buildOttawaLabelTextExpression(
      options?.useChaudiereBridgeOverride ?? false
    );
  }
  if (city === "montreal") {
    return buildMontrealLabelTextExpression();
  }
  return ROAD_LABEL_TEXT_EXPRESSION;
};

const MIN_NAME_SUBSTRING_LENGTH = 3;
const MIN_REF_SUBSTRING_LENGTH = 1;
const ALWAYS_FALSE_EXPRESSION: ExpressionSpecification = ["literal", false];
const TOKEN_PARTS_SPLIT_REGEX = /[^a-z0-9]+/i;
const NUMERIC_PART_REGEX = /^\d+$/;
const MAJOR_HIGHWAY_TYPES = [
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
];
const MAJOR_HIGHWAY_FILTER: FilterSpecification = [
  "in",
  ["get", "highway"],
  ["literal", MAJOR_HIGHWAY_TYPES],
];

const DIRECTIONAL_SUFFIX_PARTS = new Set([
  "n",
  "s",
  "e",
  "w",
  "o",
  "north",
  "south",
  "east",
  "west",
  "nord",
  "sud",
  "est",
  "ouest",
]);
const normalizeRoadToken = (value: string) => value.trim().toLowerCase();
const foldRoadToken = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const foldTokenForMatch = (value: string) =>
  foldRoadToken(value.trim().toLowerCase());
const CHAUDIERE_BRIDGE_TOKEN_FOLDED = foldTokenForMatch(CHAUDIERE_BRIDGE_LABEL);
const findTokenByFoldedMatch = (tokens: string[], foldedToken: string) =>
  tokens.find((token) => foldTokenForMatch(token) === foldedToken);
const findChaudiereBridgeToken = (tokens: string[]) =>
  findTokenByFoldedMatch(tokens, CHAUDIERE_BRIDGE_TOKEN_FOLDED);
const hasChaudiereBridgeToken = (tokens: string[]) =>
  Boolean(findChaudiereBridgeToken(tokens));

const getTokenParts = (token: string) => {
  const parts = token.split(TOKEN_PARTS_SPLIT_REGEX).filter(Boolean);
  if (!parts.length) return [];
  const filtered = parts.filter(
    (part) => part.length >= 2 || NUMERIC_PART_REGEX.test(part)
  );
  return filtered.length ? filtered : parts;
};

const getFoldedTokenParts = (token: string) =>
  getTokenParts(foldRoadToken(token));

const buildTokenMatchExpression = (
  token: string,
  fieldExpression: ExpressionSpecification,
  minSubstringLength: number
): ExpressionSpecification => {
  const parts = getTokenParts(token);
  if (!parts.length) return ALWAYS_FALSE_EXPRESSION;
  if (parts.length > 1) {
    const partExpressions = parts.map(
      (part) => ["in", part, fieldExpression] as ExpressionSpecification
    );
    return ["all", ...partExpressions] as ExpressionSpecification;
  }
  const [part] = parts;
  if (part.length < minSubstringLength) {
    return ["==", fieldExpression, part];
  }
  return ["in", part, fieldExpression];
};

type VisibleRoad = {
  token: string;
  label: string;
};

const isHighwayToken = (token: string, label: string) =>
  NUMERIC_PART_REGEX.test(token) || NUMERIC_PART_REGEX.test(label);

type RoadCatalog = {
  names: string[];
  refs: string[];
  aliases?: RoadAliasGroup[];
};

type RoadAliasGroup = {
  token: string;
  label?: string;
  names?: string[];
  refs?: string[];
};

type RoadIndexEntry = {
  label: string;
  normalized: string;
  parts: string[];
};

type RoadAlias = {
  label?: string;
  names: string[];
  refs: string[];
};

type RoadIndex = {
  nameEntries: RoadIndexEntry[];
  refEntries: RoadIndexEntry[];
  nameLabelByNormalized: Map<string, string>;
  refLabelByNormalized: Map<string, string>;
  aliasByToken: Map<string, RoadAlias>;
  aliasTokenByValue: Map<string, string>;
};

type RoadMatchIndex = {
  matchedNames: string[];
  strictMatchedNames: string[];
  matchedRefs: string[];
  nameMatchesByToken: Map<string, string[]>;
  refMatchesByToken: Map<string, string[]>;
  tokenLabels: Map<string, string>;
};

type TokenMatch = {
  matchedNames: Set<string>;
  strictMatchedNames: Set<string>;
  matchedRefs: Set<string>;
  nameMatches: Set<string>;
  refMatches: Set<string>;
  tokenLabel: string | null;
};

const getNameParts = (value: string) => getFoldedTokenParts(value);

const wordMatchesTokenPart = (tokenPart: string, namePart: string) => {
  if (!tokenPart || !namePart) return false;
  if (NUMERIC_PART_REGEX.test(tokenPart)) return namePart === tokenPart;
  if (tokenPart.length < MIN_NAME_SUBSTRING_LENGTH) {
    return namePart === tokenPart;
  }
  if (namePart === tokenPart) return true;
  return namePart.endsWith("s") && namePart.slice(0, -1) === tokenPart;
};

const hasOnlyDirectionalSuffixParts = (
  tokenParts: string[],
  nameParts: string[]
) => {
  if (nameParts.length < tokenParts.length) return false;
  if (nameParts.length === tokenParts.length) return true;
  for (let index = tokenParts.length; index < nameParts.length; index += 1) {
    if (!DIRECTIONAL_SUFFIX_PARTS.has(nameParts[index])) return false;
  }
  return true;
};

const matchesNameTokenParts = (tokenParts: string[], nameParts: string[]) => {
  if (!tokenParts.length || !nameParts.length) return false;
  if (tokenParts.length === 1) {
    return nameParts.some((namePart) =>
      wordMatchesTokenPart(tokenParts[0], namePart)
    );
  }
  if (nameParts.length < tokenParts.length) return false;
  for (let index = 0; index < tokenParts.length; index += 1) {
    if (!wordMatchesTokenPart(tokenParts[index], nameParts[index])) {
      return false;
    }
  }
  if (!hasOnlyDirectionalSuffixParts(tokenParts, nameParts)) {
    return false;
  }
  return true;
};

const matchesRefTokenParts = (tokenParts: string[], refParts: string[]) => {
  if (!tokenParts.length || !refParts.length) return false;
  if (tokenParts.length === 1) {
    return refParts.includes(tokenParts[0]);
  }
  return tokenParts.every((tokenPart) => refParts.includes(tokenPart));
};

const splitNamesByPopularity = (names: string[]) => {
  const majorPopular: string[] = [];
  const residentialPopular: string[] = [];
  const other: string[] = [];

  for (const name of names) {
    if (RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(name)) {
      residentialPopular.push(name);
    } else if (POPULAR_ROAD_NAME_SET.has(name)) {
      majorPopular.push(name);
    } else {
      other.push(name);
    }
  }

  return { majorPopular, residentialPopular, other };
};

type PreferredPopularMatch = {
  normalized: string;
  label: string;
};

const isPreferredPopularCandidate = (
  candidate: RoadIndexEntry,
  current: RoadIndexEntry,
  tokenParts: string[]
) => {
  if (tokenParts.length === 1) {
    const candidateStartsWith = candidate.parts[0] === tokenParts[0];
    const currentStartsWith = current.parts[0] === tokenParts[0];
    if (candidateStartsWith !== currentStartsWith) {
      return candidateStartsWith;
    }
  }
  const candidateExact = candidate.parts.length === tokenParts.length;
  const currentExact = current.parts.length === tokenParts.length;
  if (candidateExact !== currentExact) return candidateExact;
  if (candidate.parts.length !== current.parts.length) {
    return candidate.parts.length < current.parts.length;
  }
  if (candidate.label.length !== current.label.length) {
    return candidate.label.length < current.label.length;
  }
  return candidate.label.localeCompare(current.label) < 0;
};

const selectPreferredPopularMatch = (
  token: string,
  tokenParts: string[],
  roadIndex: RoadIndex
): PreferredPopularMatch | null => {
  const exactLabel = roadIndex.nameLabelByNormalized.get(token);
  if (exactLabel) {
    return { normalized: token, label: exactLabel };
  }

  let best: RoadIndexEntry | null = null;
  for (const entry of roadIndex.nameEntries) {
    if (!matchesNameTokenParts(tokenParts, entry.parts)) continue;
    if (!best || isPreferredPopularCandidate(entry, best, tokenParts)) {
      best = entry;
    }
  }

  if (!best) return null;
  return { normalized: best.normalized, label: best.label };
};

const buildStrictNameFilter = (
  names: string[],
  highwayFilter?: FilterSpecification
): FilterSpecification | null => {
  if (!names.length) return null;

  const strictFilter = ([
    "any",
    ...ROAD_NAME_EXPRESSIONS.map(
      (expr) => ["in", expr, ["literal", names]]
    ),
  ] as unknown) as FilterSpecification;

  if (!highwayFilter) return strictFilter;
  return ["all", highwayFilter, strictFilter] as FilterSpecification;
};

const buildRefMatchFilter = (
  refs: string[],
  includeHighwayFilter: boolean
): FilterSpecification | null => {
  if (!refs.length) return null;
  const refFilters: FilterSpecification[] = [];
  const refsWithoutExclusions: string[] = [];

  for (const ref of refs) {
    const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    if (!exclusions?.size) {
      refsWithoutExclusions.push(ref);
      continue;
    }
    refFilters.push([
      "all",
      ["in", ROAD_REF_EXPRESSION, ["literal", [ref]]],
      ["!", buildAnyNameInExpression(Array.from(exclusions))],
    ] as FilterSpecification);
  }

  if (refsWithoutExclusions.length) {
    refFilters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", refsWithoutExclusions],
    ] as FilterSpecification);
  }

  if (!refFilters.length) return null;
  const baseFilter =
    refFilters.length === 1
      ? refFilters[0]
      : (["any", ...refFilters] as FilterSpecification);
  return includeHighwayFilter
    ? (["all", MAJOR_HIGHWAY_FILTER, baseFilter] as FilterSpecification)
    : baseFilter;
};


const buildRoadIndex = (catalog: RoadCatalog): RoadIndex => {
  const buildEntries = (values: string[]) => {
    const entries: RoadIndexEntry[] = [];
    const labelByNormalized = new Map<string, string>();
    const seen = new Set<string>();

    for (const value of values) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const normalized = normalizeRoadToken(trimmed);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      labelByNormalized.set(normalized, trimmed);
      entries.push({
        label: trimmed,
        normalized,
        parts: getNameParts(normalized),
      });
    }

    return { entries, labelByNormalized };
  };

  const buildAliases = (aliases?: RoadAliasGroup[]) => {
    const aliasByToken = new Map<string, RoadAlias>();
    const aliasTokenByValue = new Map<string, string>();
    if (!aliases?.length) {
      return { aliasByToken, aliasTokenByValue };
    }

    for (const alias of aliases) {
      const token = normalizeRoadToken(alias.token ?? "");
      if (!token) continue;
      const names = (alias.names ?? [])
        .map((name) => normalizeRoadToken(name))
        .filter(Boolean);
      const refs = (alias.refs ?? [])
        .map((ref) => normalizeRoadToken(ref))
        .filter(Boolean);
      if (!names.length && !refs.length) continue;
      const label = alias.label?.trim() || undefined;
      const existing = aliasByToken.get(token);
      const mergedNames = new Set([...(existing?.names ?? []), ...names]);
      const mergedRefs = new Set([...(existing?.refs ?? []), ...refs]);
      const merged: RoadAlias = {
        label: existing?.label ?? label,
        names: Array.from(mergedNames),
        refs: Array.from(mergedRefs),
      };
      aliasByToken.set(token, merged);
      for (const name of merged.names) {
        aliasTokenByValue.set(name, token);
      }
      for (const ref of merged.refs) {
        aliasTokenByValue.set(ref, token);
      }
    }

    return { aliasByToken, aliasTokenByValue };
  };

  const nameIndex = buildEntries(catalog.names);
  const refIndex = buildEntries(catalog.refs);
  const aliasIndex = buildAliases(catalog.aliases);

  return {
    nameEntries: nameIndex.entries,
    refEntries: refIndex.entries,
    nameLabelByNormalized: nameIndex.labelByNormalized,
    refLabelByNormalized: refIndex.labelByNormalized,
    aliasByToken: aliasIndex.aliasByToken,
    aliasTokenByValue: aliasIndex.aliasTokenByValue,
  };
};

const tokenMatchCache = new WeakMap<RoadIndex, Map<string, TokenMatch>>();

const getTokenMatch = (roadIndex: RoadIndex, token: string): TokenMatch => {
  let cache = tokenMatchCache.get(roadIndex);
  if (!cache) {
    cache = new Map();
    tokenMatchCache.set(roadIndex, cache);
  }

  const cached = cache.get(token);
  if (cached) return cached;

  const tokenParts = getFoldedTokenParts(token);
  const matchedNames = new Set<string>([token]);
  const strictMatchedNames = new Set<string>();
  const matchedRefs = new Set<string>([token]);
  const nameMatches = new Set<string>([token]);
  const refMatches = new Set<string>([token]);

  const alias = roadIndex.aliasByToken.get(token);
  const nameLabel = roadIndex.nameLabelByNormalized.get(token);
  const refLabel = roadIndex.refLabelByNormalized.get(token);
  let tokenLabel: string | null = null;
  let hasExactLabel = false;

  if (alias?.label) {
    tokenLabel = alias.label;
    hasExactLabel = true;
  } else if (nameLabel) {
    tokenLabel = nameLabel;
    hasExactLabel = true;
  } else if (refLabel) {
    tokenLabel = refLabel;
    hasExactLabel = true;
  }

  let preferredMatch: PreferredPopularMatch | null = null;
  if (POPULAR_ROAD_NAME_SET.has(token)) {
    preferredMatch = nameLabel
      ? { normalized: token, label: nameLabel }
      : selectPreferredPopularMatch(token, tokenParts, roadIndex);
    if (preferredMatch) {
      strictMatchedNames.add(preferredMatch.normalized);
      nameMatches.add(preferredMatch.normalized);
      tokenLabel = preferredMatch.label;
      hasExactLabel = true;
    }
  }

  if (!preferredMatch) {
    for (const entry of roadIndex.nameEntries) {
      if (!matchesNameTokenParts(tokenParts, entry.parts)) continue;
      matchedNames.add(entry.normalized);
      nameMatches.add(entry.normalized);
      if (!hasExactLabel) {
        if (!tokenLabel || entry.label.length < tokenLabel.length) {
          tokenLabel = entry.label;
        }
      }
    }
  }

  for (const entry of roadIndex.refEntries) {
    if (!matchesRefTokenParts(tokenParts, entry.parts)) continue;
    matchedRefs.add(entry.normalized);
    refMatches.add(entry.normalized);
    if (!hasExactLabel) {
      if (!tokenLabel || entry.label.length < tokenLabel.length) {
        tokenLabel = entry.label;
      }
    }
  }

  if (alias?.names.length) {
    for (const name of alias.names) {
      matchedNames.add(name);
      nameMatches.add(name);
    }
  }

  if (alias?.refs.length) {
    for (const ref of alias.refs) {
      matchedRefs.add(ref);
      refMatches.add(ref);
    }
  }

  const result: TokenMatch = {
    matchedNames,
    strictMatchedNames,
    matchedRefs,
    nameMatches,
    refMatches,
    tokenLabel,
  };

  cache.set(token, result);
  return result;
};

const buildRoadMatchIndex = (
  roadIndex: RoadIndex,
  roadTokens: string[],
  labelOverrides?: Map<string, string> | null
): RoadMatchIndex => {
  const matchedNames = new Set<string>();
  const matchedRefs = new Set<string>();
  const strictMatchedNames = new Set<string>();
  const nameMatchesByToken = new Map<string, Set<string>>();
  const refMatchesByToken = new Map<string, Set<string>>();
  const tokenLabels = new Map<string, string>();
  for (const token of roadTokens) {
    const tokenMatch = getTokenMatch(roadIndex, token);
    for (const name of tokenMatch.matchedNames) {
      matchedNames.add(name);
    }
    for (const name of tokenMatch.strictMatchedNames) {
      strictMatchedNames.add(name);
    }
    for (const ref of tokenMatch.matchedRefs) {
      matchedRefs.add(ref);
    }
    nameMatchesByToken.set(token, new Set(tokenMatch.nameMatches));
    refMatchesByToken.set(token, new Set(tokenMatch.refMatches));

    const overrideLabel = labelOverrides?.get(token);
    if (overrideLabel) {
      tokenLabels.set(token, overrideLabel);
    } else if (tokenMatch.tokenLabel) {
      tokenLabels.set(token, tokenMatch.tokenLabel);
    }
  }

  const mapToSortedArrays = (map: Map<string, Set<string>>) =>
    new Map(
      Array.from(map.entries()).map(([token, set]) => [
        token,
        Array.from(set).sort((a, b) => a.localeCompare(b)),
      ])
    );

  return {
    matchedNames: Array.from(matchedNames).sort((a, b) =>
      a.localeCompare(b)
    ),
    strictMatchedNames: Array.from(strictMatchedNames).sort((a, b) =>
      a.localeCompare(b)
    ),
    matchedRefs: Array.from(matchedRefs).sort((a, b) => a.localeCompare(b)),
    nameMatchesByToken: mapToSortedArrays(nameMatchesByToken),
    refMatchesByToken: mapToSortedArrays(refMatchesByToken),
    tokenLabels,
  };
};

const getRoadFilterOverrides = (city: CityKey, roadTokens: string[]) => {
  if (city !== "ottawa") return [];
  if (!hasChaudiereBridgeToken(roadTokens)) return [];
  return [CHAUDIERE_BRIDGE_OVERRIDE_FILTER];
};
const getHighwayRefTokens = (city: CityKey) =>
  city === "ottawa" ? OTTAWA_HIGHWAY_REF_TOKENS : null;
const getRoadGlobalFilters = (
  city: CityKey,
  includeGatineauRoads: boolean
) => {
  if (city !== "ottawa") return [];
  const filters: FilterSpecification[] = [RUE_CLARENCE_EXCLUDE_FILTER];
  if (!includeGatineauRoads) {
    filters.push(GATINEAU_ROADS_EXCLUDE_FILTER);
  }
  return filters;
};
const shouldUseChaudiereBridgeOverride = (
  city: CityKey,
  roadTokens: string[]
) => city === "ottawa" && hasChaudiereBridgeToken(roadTokens);

const buildRoadFilter = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null,
  extraFilters: FilterSpecification[] = [],
  globalFilters: FilterSpecification[] = [],
  options?: { highwayRefTokens?: Set<string> | null }
): FilterSpecification => {
  if (!roadTokens.length) {
    return ALWAYS_FALSE_EXPRESSION;
  }
  const highwayRefTokens = options?.highwayRefTokens ?? null;
  if (!matchIndex) {
    const majorStrictNameTokens = roadTokens.filter(
      (token) =>
        POPULAR_ROAD_NAME_SET.has(token) &&
        !RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );

    const residentialStrictNameTokens = roadTokens.filter((token) =>
      RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );

    const looseTokens = roadTokens.filter(
      (token) =>
        !POPULAR_ROAD_NAME_SET.has(token) &&
        !RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );
    const highwayOnlyLooseTokens = highwayRefTokens
      ? looseTokens.filter((token) => highwayRefTokens.has(token))
      : [];
    const standardLooseTokens = highwayRefTokens
      ? looseTokens.filter((token) => !highwayRefTokens.has(token))
      : looseTokens;

    const filters: FilterSpecification[] = [];

    const majorStrictNameFilter = buildStrictNameFilter(
      majorStrictNameTokens,
      MAJOR_HIGHWAY_FILTER
    );
    if (majorStrictNameFilter) {
      filters.push(majorStrictNameFilter);
    }

    const residentialStrictNameFilter = buildStrictNameFilter(
      residentialStrictNameTokens
    );
    if (residentialStrictNameFilter) {
      filters.push(residentialStrictNameFilter);
    }
    if (standardLooseTokens.length) {
      filters.push([
        "any",
        ...standardLooseTokens.flatMap((token) => [
          buildTokenMatchExpression(
            token,
            ROAD_NAME_EXPRESSION,
            MIN_NAME_SUBSTRING_LENGTH
          ),
          buildTokenMatchExpression(
            token,
            ROAD_REF_EXPRESSION,
            MIN_REF_SUBSTRING_LENGTH
          ),
        ]),
      ]);
    }
    if (highwayOnlyLooseTokens.length) {
      filters.push(
        ...highwayOnlyLooseTokens.map(
          (token) =>
            ([
              "all",
              MAJOR_HIGHWAY_FILTER,
              buildTokenMatchExpression(
                token,
                ROAD_REF_EXPRESSION,
                MIN_REF_SUBSTRING_LENGTH
              ),
            ] as unknown as FilterSpecification)
        )
      );
    }
    if (extraFilters.length) {
      filters.push(...extraFilters);
    }
    if (!filters.length) return ALWAYS_FALSE_EXPRESSION;
    return [
      "all",
      MAIN_STREET_DOWNTOWN_FILTER,
      ...globalFilters,
      ["any", ...filters],
    ] as FilterSpecification;
  }

  const filters: FilterSpecification[] = [];
  const highwayNameMatches = highwayRefTokens
    ? (() => {
        const names = new Set<string>();
        for (const token of highwayRefTokens) {
          const matches = matchIndex.nameMatchesByToken.get(token);
          matches?.forEach((name) => names.add(name));
        }
        return names;
      })()
    : null;
  const strictMatchedNames = highwayNameMatches
    ? matchIndex.strictMatchedNames.filter(
        (name) => !highwayNameMatches.has(name)
      )
    : matchIndex.strictMatchedNames;
  const matchedNames = highwayNameMatches
    ? matchIndex.matchedNames.filter((name) => !highwayNameMatches.has(name))
    : matchIndex.matchedNames;

  const {
    majorPopular: majorPopularStrictNames,
    residentialPopular: residentialPopularStrictNames,
    other: otherStrictNames,
  } = splitNamesByPopularity(strictMatchedNames);

  const {
    majorPopular: majorPopularMatchedNames,
    residentialPopular: residentialPopularMatchedNames,
    other: otherMatchedNames,
  } = splitNamesByPopularity(matchedNames);

  const strictMajorPopularFilter = buildStrictNameFilter(
    majorPopularStrictNames,
    MAJOR_HIGHWAY_FILTER
  );

  const strictResidentialPopularFilter = buildStrictNameFilter(
    residentialPopularStrictNames
  );

  const strictOtherFilter = buildStrictNameFilter(otherStrictNames);

  if (strictMajorPopularFilter) {
    filters.push(strictMajorPopularFilter);
  }
  if (strictResidentialPopularFilter) {
    filters.push(strictResidentialPopularFilter);
  }
  if (strictOtherFilter) {
    filters.push(strictOtherFilter);
  }

  if (majorPopularMatchedNames.length) {
    filters.push([
      "all",
      MAJOR_HIGHWAY_FILTER,
      buildAnyNameInExpression(majorPopularMatchedNames),
    ]);
  }

  if (residentialPopularMatchedNames.length) {
    filters.push(buildAnyNameInExpression(residentialPopularMatchedNames));
  }

  if (otherMatchedNames.length) {
    filters.push(
      buildAnyNameInExpression(otherMatchedNames) as unknown as FilterSpecification
    );
  }
  const highwayMatchedRefs = highwayRefTokens
    ? (() => {
        const refs = new Set<string>();
        for (const token of highwayRefTokens) {
          const matches = matchIndex.refMatchesByToken.get(token);
          matches?.forEach((ref) => refs.add(ref));
        }
        return Array.from(refs);
      })()
    : [];
  const standardMatchedRefs = highwayMatchedRefs.length
    ? matchIndex.matchedRefs.filter((ref) => !highwayMatchedRefs.includes(ref))
    : matchIndex.matchedRefs;
  const standardRefFilter = buildRefMatchFilter(standardMatchedRefs, false);
  if (standardRefFilter) {
    filters.push(standardRefFilter);
  }
  const highwayRefFilter = buildRefMatchFilter(highwayMatchedRefs, true);
  if (highwayRefFilter) {
    filters.push(highwayRefFilter);
  }
  if (extraFilters.length) {
    filters.push(...extraFilters);
  }
  if (!filters.length) return ALWAYS_FALSE_EXPRESSION;
  return [
    "all",
    MAIN_STREET_DOWNTOWN_FILTER,
    ...globalFilters,
    ["any", ...filters],
  ] as FilterSpecification;
};

const buildRoadColorExpression = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null,
  fallbackColor: string = DEFAULT_ROAD_COLOR,
  colorOverrides?: Record<string, string>
): ExpressionSpecification | string => {
  if (!roadTokens.length) return fallbackColor;
  const getTokenColor = (token: string) =>
    colorOverrides?.[token] ?? ROAD_COLOR_OVERRIDES[token] ?? stringToColor(token);
  const chaudiereToken = findChaudiereBridgeToken(roadTokens);
  const overridePairs: Array<ExpressionSpecification | string> = [];
  if (chaudiereToken) {
    overridePairs.push(
      CHAUDIERE_BRIDGE_OVERRIDE_MATCH,
      getTokenColor(chaudiereToken)
    );
  }
  if (!matchIndex) {
    const colorPairs = roadTokens.flatMap((token) => {
      const tokenColor = getTokenColor(token);
      return [
        buildTokenMatchExpression(
          token,
          ROAD_NAME_EXPRESSION,
          MIN_NAME_SUBSTRING_LENGTH
        ),
        tokenColor,
        buildTokenMatchExpression(
          token,
          ROAD_REF_EXPRESSION,
          MIN_REF_SUBSTRING_LENGTH
        ),
        tokenColor,
      ];
    });
    return [
      "case",
      ...overridePairs,
      ...colorPairs,
      fallbackColor,
    ] as ExpressionSpecification;
  }

  const colorPairs = roadTokens.flatMap((token) => {
    const tokenColor = getTokenColor(token);
    const nameMatches = matchIndex.nameMatchesByToken.get(token);
    const refMatches = matchIndex.refMatchesByToken.get(token);
    const pairs: Array<ExpressionSpecification | string> = [];
    if (nameMatches?.length) {
      pairs.push(
        buildAnyNameInExpression(nameMatches),
        tokenColor
      );
    }
    if (refMatches?.length) {
      const refMatchExpression = buildRefMatchExpression(refMatches);
      if (refMatchExpression) {
        pairs.push(refMatchExpression, tokenColor);
      }
    }
    return pairs;
  });

  if (!colorPairs.length && !overridePairs.length) return fallbackColor;
  return [
    "case",
    ...overridePairs,
    ...colorPairs,
    fallbackColor,
  ] as ExpressionSpecification;
};


const buildRoadOpacityExpression = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null,
  fallbackOpacity = 1
): ExpressionSpecification | number => {
  if (!roadTokens.length) return fallbackOpacity;
  const overridePairs: Array<ExpressionSpecification | number> = [];
  if (findChaudiereBridgeToken(roadTokens)) {
    overridePairs.push(CHAUDIERE_BRIDGE_OVERRIDE_MATCH, 1);
  }
  if (!matchIndex) {
    const opacityPairs = roadTokens.flatMap((token) => [
      buildTokenMatchExpression(
        token,
        ROAD_NAME_EXPRESSION,
        MIN_NAME_SUBSTRING_LENGTH
      ),
      1,
      buildTokenMatchExpression(
        token,
        ROAD_REF_EXPRESSION,
        MIN_REF_SUBSTRING_LENGTH
      ),
      1,
    ]);
    return [
      "case",
      ...overridePairs,
      ...opacityPairs,
      fallbackOpacity,
    ] as ExpressionSpecification;
  }

  const opacityPairs = roadTokens.flatMap((token) => {
    const nameMatches = matchIndex.nameMatchesByToken.get(token);
    const refMatches = matchIndex.refMatchesByToken.get(token);
    const pairs: Array<ExpressionSpecification | number> = [];
    if (nameMatches?.length) {
      pairs.push(
        buildAnyNameInExpression(nameMatches),
        1
      );
    }
    if (refMatches?.length) {
      const refMatchExpression = buildRefMatchExpression(refMatches);
      if (refMatchExpression) {
        pairs.push(refMatchExpression, 1);
      }
    }
    return pairs;
  });

  if (!opacityPairs.length && !overridePairs.length) return fallbackOpacity;
  return [
    "case",
    ...overridePairs,
    ...opacityPairs,
    fallbackOpacity,
  ] as ExpressionSpecification;
};

const shuffleTokens = (tokens: string[]) => {
  const shuffled = [...tokens];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

const getQuizEmptyMessage = (correctCount: number, guessCount: number) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No selected roads visible. Pan or zoom for another prompt.";
};

const getBuildingQuizEmptyMessage = (
  correctCount: number,
  guessCount: number
) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No campus buildings visible. Zoom in for another prompt.";
};

const NAME_SEPARATOR_REGEX = /\s*(?:\/|&|\+)\s*/i;

const getFeatureNameCandidates = (value: string) => {
  const normalized = normalizeRoadToken(value);
  if (!normalized) return [];
  const candidates = new Set([normalized]);
  const splitNames = normalized
    .split(NAME_SEPARATOR_REGEX)
    .map((entry) => entry.trim())
    .filter(Boolean);
  splitNames.forEach((entry) => candidates.add(entry));
  return Array.from(candidates);
};

const featureMatchesToken = (
  feature: MapGeoJSONFeature,
  tokenParts: string[],
  token: string
) => {
  const properties = feature.properties ?? {};
  const nameValues = [
    properties["name"],
    properties["name:en"],
    properties["name_en"],
  ];

  for (const value of nameValues) {
    if (typeof value !== "string") continue;
    for (const normalized of getFeatureNameCandidates(value)) {
      if (matchesNameTokenParts(tokenParts, getNameParts(normalized))) {
        return true;
      }
    }
  }

  const refValue = properties["ref"];
  if (typeof refValue === "string") {
    const normalizedRef = normalizeRoadToken(refValue);
    if (
      normalizedRef &&
      matchesRefTokenParts(tokenParts, getTokenParts(normalizedRef))
    ) {
      const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(token);
      if (exclusions?.size) {
        for (const value of nameValues) {
          if (typeof value !== "string") continue;
          const normalizedName = normalizeRoadToken(value);
          if (normalizedName && exclusions.has(normalizedName)) {
            return false;
          }
        }
      }
      return true;
    }
  }

  return false;
};

const canonicalizeBuildingLabel = (label: string) =>
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP.get(label) ?? label;
const normalizeBuildingLabel = (label: string) =>
  canonicalizeBuildingLabel(label.trim()).toLowerCase();
const getBuildingDisplayLabel = (label: string) => {
  const canonicalLabel = canonicalizeBuildingLabel(label.trim());
  return (
    KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP.get(canonicalLabel) ??
    canonicalLabel
  );
};

const buildingFeatureMatchesLabel = (
  feature: MapGeoJSONFeature,
  label: string
) => {
  const properties = feature.properties ?? {};
  const targetLabel = getBuildingDisplayLabel(label);
  const labelValues = [
    properties["name"],
    properties["official_name"],
    properties["alt_name"],
    properties["operator"],
  ];
  return labelValues.some(
    (value) =>
      typeof value === "string" &&
      getBuildingDisplayLabel(value) === targetLabel
  );
};

const getBuildingLabelCandidate = (feature: MapGeoJSONFeature) => {
  const properties = feature.properties ?? {};
  const labelValues = [
    properties["name"],
    properties["official_name"],
    properties["alt_name"],
    properties["operator"],
  ];
  for (const value of labelValues) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    return {
      canonicalLabel: canonicalizeBuildingLabel(trimmed),
      displayLabel: getBuildingDisplayLabel(trimmed),
    };
  }
  return null;
};

type LngLat = [number, number];

const getRingAreaAndCentroid = (ring: LngLat[]) => {
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
  const centroid: LngLat = [x / (6 * area), y / (6 * area)];
  return { area, centroid };
};

const getPolygonAreaAndCentroid = (rings: LngLat[][]) => {
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
  const centroid: LngLat = [xSum / areaSum, ySum / areaSum];
  return { area: Math.abs(areaSum), centroid };
};

const getGeometryAreaAndCentroid = (
  geometry: GeoJSON.Geometry | null | undefined
) => {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return getPolygonAreaAndCentroid(geometry.coordinates as LngLat[][]);
  }
  if (geometry.type === "MultiPolygon") {
    let areaSum = 0;
    let xSum = 0;
    let ySum = 0;
    for (const polygon of geometry.coordinates as LngLat[][][]) {
      const result = getPolygonAreaAndCentroid(polygon);
      if (!result) continue;
      areaSum += result.area;
      xSum += result.centroid[0] * result.area;
      ySum += result.centroid[1] * result.area;
    }
    if (areaSum === 0) return null;
    const centroid: LngLat = [xSum / areaSum, ySum / areaSum];
    return { area: areaSum, centroid };
  }
  return null;
};

const getQuizFeatureTokens = (
  features: MapGeoJSONFeature[],
  matchIndex: RoadMatchIndex | null
) => {
  const matchedTokens = new Set<string>();
  if (!matchIndex) return matchedTokens;

  for (const feature of features) {
    const properties = feature.properties ?? {};
    const nameValues = [
      properties["name"],
      properties["name:en"],
      properties["name_en"],
    ];
    const nameCandidates = new Set<string>();
    for (const value of nameValues) {
      if (typeof value !== "string") continue;
      getFeatureNameCandidates(value).forEach((candidate) =>
        nameCandidates.add(candidate)
      );
    }

    const refValue = properties["ref"];
    const refParts =
      typeof refValue === "string"
        ? getTokenParts(normalizeRoadToken(refValue))
        : [];

    for (const [token, names] of matchIndex.nameMatchesByToken) {
      if (matchedTokens.has(token)) continue;
      for (const name of names) {
        if (nameCandidates.has(name)) {
          matchedTokens.add(token);
          break;
        }
      }
    }

    if (refParts.length) {
      for (const [token, refs] of matchIndex.refMatchesByToken) {
        if (matchedTokens.has(token)) continue;
        let hasRefMatch = false;
        for (const ref of refs) {
          if (matchesRefTokenParts(getTokenParts(ref), refParts)) {
            hasRefMatch = true;
            break;
          }
        }
        if (!hasRefMatch) continue;
        const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(token);
        if (exclusions?.size) {
          let hasExclusion = false;
          for (const name of nameCandidates) {
            if (exclusions.has(name)) {
              hasExclusion = true;
              break;
            }
          }
          if (hasExclusion) continue;
        }
        matchedTokens.add(token);
      }
    }
  }

  return matchedTokens;
};

const BUILDING_LABEL_TEXT_EXPRESSION: ExpressionSpecification = [
  "coalesce",
  ["get", "name"],
  ["get", "official_name"],
  ["get", "alt_name"],
  ["get", "operator"],
];
const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES: Array<[string, string]> = [
  ["Bruce Wing", "Miller Hall"],
  ["Jean Royce Hall - Phase 1", "Jean Royce Hall"],
  ["Jean Royce Hall - Phase 2", "Jean Royce Hall"],
];
const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
);
// Edit this list to rename building labels on the map and in the quiz.
const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES: Array<[string, string]> = [
  ["Beamish-Munro Hall", "Beamish-Munro Hall (ILC)"],
  ["Duncan McArthur Hall", "Duncan McArthur Hall (Faculty of Education)"],
  ["Queen's Athletics Recreation Centre", "Queen's Athletics Recreation Centre (ARC)"],
];
const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
);
const BUILDING_LABEL_CANONICAL_EXPRESSION =
  buildBuildingLabelCanonicalExpression(
    BUILDING_LABEL_TEXT_EXPRESSION,
    KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
  );
const BUILDING_LABEL_DISPLAY_EXPRESSION =
  buildBuildingLabelCanonicalExpression(
    BUILDING_LABEL_CANONICAL_EXPRESSION,
    KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
  );
// Edit this list to control which campus buildings are shown (remove a name to hide it).
const KINGSTON_BUILDING_VISIBLE_LABELS = [
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
  "Endaayaan \u2013 Tkan\u00f3nsote",
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
  "Theological Hall",
];
const KINGSTON_BUILDING_DISPLAY_LABELS = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => getBuildingDisplayLabel(label)
);
const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => normalizeBuildingLabel(label)
);
const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER_SET = new Set(
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER
);
const DEFAULT_BUILDING_LABEL_OFFSET: [number, number] = [0, 0];
const EMPTY_BUILDING_LABEL_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: [],
};

// Keep one label per canonical building name by picking the largest visible polygon.
const buildBuildingLabelFeatureCollection = (
  features: MapGeoJSONFeature[],
  allowedLabels: Set<string> | null = null
): GeoJSON.FeatureCollection<GeoJSON.Point> => {
  if (allowedLabels && allowedLabels.size === 0) {
    return { type: "FeatureCollection", features: [] };
  }
  const labels = new Map<
    string,
    { area: number; label: string; canonicalLabel: string; point: LngLat }
  >();
  for (const feature of features) {
    const labelInfo = getBuildingLabelCandidate(feature);
    if (!labelInfo) continue;
    if (allowedLabels && !allowedLabels.has(labelInfo.displayLabel)) continue;
    const normalizedLabel = normalizeBuildingLabel(labelInfo.canonicalLabel);
    if (!KINGSTON_BUILDING_VISIBLE_LABELS_LOWER_SET.has(normalizedLabel)) continue;
    const geometryInfo = getGeometryAreaAndCentroid(
      feature.geometry as GeoJSON.Geometry
    );
    if (!geometryInfo) continue;
    const existing = labels.get(normalizedLabel);
    if (!existing || geometryInfo.area > existing.area) {
      labels.set(normalizedLabel, {
        area: geometryInfo.area,
        label: labelInfo.displayLabel,
        canonicalLabel: labelInfo.canonicalLabel,
        point: geometryInfo.centroid,
      });
    }
  }
  const labelFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const entry of labels.values()) {
    const labelOffset =
      DEFAULT_BUILDING_LABEL_OFFSET;
    labelFeatures.push({
      type: "Feature",
      properties: {
        label: entry.label,
        canonical_label: entry.canonicalLabel,
        label_offset: labelOffset,
      },
      geometry: { type: "Point", coordinates: entry.point },
    });
  }
  return { type: "FeatureCollection", features: labelFeatures };
};
const KINGSTON_BUILDING_FALLBACK_COLOR = "#d8e4ef";
const KINGSTON_BUILDING_QUIZ_BASE_COLOR = "#b8c0c7";
const KINGSTON_BUILDING_ROAD_QUIZ_COLOR = "#f2f2f2";
const KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR = "#ffffff";
// Edit this list to override building fill/halo colors by name.
const KINGSTON_BUILDING_COLOR_OVERRIDES: Record<string, string> = {
  "Leonard Hall": "#a2f0e9",
  "Walter Light Hall": "#c18772",
  "Stauffer Library": "#827cc4",
};
const KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.35,
  15,
  0.55,
  17,
  0.7,
];
const KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.15,
  15,
  0.24,
  17,
  0.32,
];
const KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  BUILDING_TILE_MIN_ZOOM,
  0.32,
  15,
  0.5,
  17,
  0.65,
];
const KINGSTON_BUILDING_OUTLINE_OPACITY = 0.9;
const KINGSTON_BUILDING_COLOR_EXPRESSION = buildBuildingColorExpression(
  BUILDING_LABEL_CANONICAL_EXPRESSION,
  KINGSTON_BUILDING_VISIBLE_LABELS,
  KINGSTON_BUILDING_FALLBACK_COLOR,
  KINGSTON_BUILDING_COLOR_OVERRIDES
);
const KINGSTON_BUILDING_VISIBLE_FILTER: FilterSpecification = [
  "match",
  ["downcase", BUILDING_LABEL_CANONICAL_EXPRESSION],
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER,
  true,
  false,
];
const BUILDING_RENDER_FILTER: FilterSpecification = [
  "all",
  ["!=", ["get", "building"], "parking"],
  ["!=", ["get", "building"], "garage"],
  KINGSTON_BUILDING_VISIBLE_FILTER,
];
const KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION: ExpressionSpecification = [
  "coalesce",
  ["get", "label_offset"],
  ["literal", [0, 0]],
];
const KINGSTON_BUILDING_LABEL_COLOR = "#000000";
const KINGSTON_BUILDING_LABEL_HALO_COLOR = buildBuildingColorExpression(
  ["get", "canonical_label"],
  KINGSTON_BUILDING_VISIBLE_LABELS,
  KINGSTON_BUILDING_FALLBACK_COLOR,
  KINGSTON_BUILDING_COLOR_OVERRIDES
);
const KINGSTON_FIELD_LABEL_TEXT_COLOR = "#000000";
const KINGSTON_FIELD_LABEL_HALO_COLOR = "#ffffff";
const KINGSTON_FIELD_LABEL_TEXT_SIZE_EXPRESSION: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  14,
  11,
  16,
  14,
  18,
  16,
];
const KINGSTON_FIELD_LABEL_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Richardson Stadium" },
      geometry: { type: "Point", coordinates: [-76.516296, 44.227681] },
    },
    {
      type: "Feature",
      properties: { name: "Nixon Field" },
      geometry: { type: "Point", coordinates: [-76.49464, 44.225158] },
    },
    {
      type: "Feature",
      properties: { name: "Tindall Field" },
      geometry: { type: "Point", coordinates: [-76.498144, 44.226704] },
    },
  ],
};

const ensureRoadLayer = (
  map: maplibregl.Map,
  city: CityKey,
  initialFilter: FilterSpecification,
  lineColorExpression: ExpressionSpecification | string,
  textColorExpression: ExpressionSpecification | string,
  labelTextExpression: ExpressionSpecification | string
) => {
  if (!map.getSource(ROAD_SOURCE_ID)) {
    map.addSource(ROAD_SOURCE_ID, {
      type: "vector",
      tiles: [getRoadTileUrl(city)],
      minzoom: ROAD_TILE_MIN_ZOOM,
      maxzoom: ROAD_TILE_MAX_ZOOM,
      bounds: CITY_CONFIG[city].tileBounds,
    });
  }

  // Base Roads
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
        "line-opacity": 0,
      },
    });
  }

  // Highlighted Roads
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
        "line-opacity": 1,
      },
    });
  }

  // Inside ensureRoadLayer function in MapView.tsx
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
          ROAD_TILE_MIN_ZOOM, 60,
          10, 150,
          14, 250
        ],
        
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "symbol-avoid-edges": false,

        "text-size": ROAD_LABEL_SIZE_EXPRESSION,
        
        "text-max-width": 8,
        "text-keep-upright": true,
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "map",
      },
      paint: {
        "text-color": textColorExpression,
        "text-halo-color": lineColorExpression,
        "text-halo-width": 2,
        "text-halo-blur": 0.5,
      },
    });
  }
};

const ensureBuildingLayer = (map: maplibregl.Map, city: CityKey) => {
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
      bounds: CITY_CONFIG[city].tileBounds,
    });
  }

  const beforeRoadBase = map.getLayer(ROAD_BASE_LAYER_ID)
    ? ROAD_BASE_LAYER_ID
    : undefined;
  const beforeRoadLabel = map.getLayer(ROAD_LABEL_LAYER_ID)
    ? ROAD_LABEL_LAYER_ID
    : undefined;

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
          "fill-opacity": KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION,
        },
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
            1.6,
          ],
          "line-opacity": KINGSTON_BUILDING_OUTLINE_OPACITY,
        },
      },
      beforeRoadBase
    );
  }

  if (!map.getSource(BUILDING_LABEL_SOURCE_ID)) {
    map.addSource(BUILDING_LABEL_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_BUILDING_LABEL_GEOJSON,
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
            16,
          ],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-max-width": 8,
          "text-anchor": "center",
          "text-offset": KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION,
        },
        paint: {
          "text-color": labelTextColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.5,
          "text-halo-blur": 0.4,
        },
      },
      beforeRoadLabel
    );
  }

  if (city === "kingston") {
    if (!map.getSource(KINGSTON_FIELD_LABEL_SOURCE_ID)) {
      map.addSource(KINGSTON_FIELD_LABEL_SOURCE_ID, {
        type: "geojson",
        data: KINGSTON_FIELD_LABEL_GEOJSON,
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
            "text-anchor": "center",
          },
          paint: {
            "text-color": KINGSTON_FIELD_LABEL_TEXT_COLOR,
            "text-halo-color": KINGSTON_FIELD_LABEL_HALO_COLOR,
            "text-halo-width": 2,
            "text-halo-blur": 0.2,
          },
        },
        beforeRoadLabel
      );
    }
  }
};

const resetRoadSource = (
  map: maplibregl.Map,
  city: CityKey,
  initialFilter: FilterSpecification,
  lineColorExpression: ExpressionSpecification | string,
  textColorExpression: ExpressionSpecification | string,
  labelTextExpression: ExpressionSpecification | string
) => {
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

const resetBuildingSource = (map: maplibregl.Map, city: CityKey) => {
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

export default function MapView() {
  const initialRoutePathname =
    typeof window === "undefined" ? "/" : getRoutePathname();
  const initialCity =
    typeof window === "undefined"
      ? DEFAULT_CITY
      : getCityFromPathname(initialRoutePathname);
  const initialTokens = CITY_CONFIG[initialCity].defaultTokens;
  const initialIsBuildingQuizActive =
    typeof window === "undefined"
      ? false
      : Boolean(CITY_CONFIG[initialCity].buildingTilePath) &&
        getBuildingQuizFromPathname(initialRoutePathname);
  const initialIsQuizActive =
    typeof window === "undefined"
      ? false
      : !initialIsBuildingQuizActive &&
        getQuizFromPathname(initialRoutePathname);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapCityRef = useRef<CityKey>(initialCity);
  const roadSourceContentSeenRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [roadsLoading, setRoadsLoading] = useState(true);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [activeRoadTokens, setActiveRoadTokens] = useState<string[]>(
    initialTokens
  );
  const [quizRoadTokens, setQuizRoadTokens] = useState<string[]>(
    initialTokens
  );
  const [roadCatalog, setRoadCatalog] = useState<RoadCatalog | null>(null);
  const [roadInput, setRoadInput] = useState("");
  const [isEditingRoads, setIsEditingRoads] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [includeGatineauRoads, setIncludeGatineauRoads] = useState(true);
  const [city, setCity] = useState<CityKey>(initialCity);
  const [isQuizActive, setIsQuizActive] = useState(initialIsQuizActive);
  const [isBuildingQuizActive, setIsBuildingQuizActive] = useState(
    initialIsBuildingQuizActive
  );
  const [quizTargetToken, setQuizTargetToken] = useState<string | null>(null);
  const [quizFoundTokens, setQuizFoundTokens] = useState<string[]>([]);
  const [quizCorrectTokens, setQuizCorrectTokens] = useState<string[]>([]);
  const [quizIncorrectTokens, setQuizIncorrectTokens] = useState<string[]>([]);
  const [quizMessage, setQuizMessage] = useState<string | null>(null);
  const [quizQueue, setQuizQueue] = useState<string[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizGuessCount, setQuizGuessCount] = useState(0);
  const [quizResultState, setQuizResultState] =
    useState<QuizResultState>("idle");
  const [buildingQuizTargetLabel, setBuildingQuizTargetLabel] = useState<
    string | null
  >(null);
  const [buildingQuizFoundLabels, setBuildingQuizFoundLabels] = useState<
    string[]
  >([]);
  const [buildingQuizCorrectLabels, setBuildingQuizCorrectLabels] = useState<
    string[]
  >([]);
  const [buildingQuizIncorrectLabels, setBuildingQuizIncorrectLabels] = useState<
    string[]
  >([]);
  const [buildingQuizMessage, setBuildingQuizMessage] = useState<string | null>(
    null
  );
  const [buildingQuizQueue, setBuildingQuizQueue] = useState<string[]>([]);
  const [buildingQuizCorrectCount, setBuildingQuizCorrectCount] = useState(0);
  const [buildingQuizGuessCount, setBuildingQuizGuessCount] = useState(0);
  const [buildingQuizResultState, setBuildingQuizResultState] =
    useState<QuizResultState>("idle");
  const quizAttemptedTokenRef = useRef<string | null>(null);
  const quizFoundTokensRef = useRef<string[]>([]);
  const quizQueueRef = useRef<string[]>([]);
  const quizRoadTokensRef = useRef<string[]>(initialTokens);
  const quizResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const buildingQuizAttemptLabelRef = useRef<string | null>(null);
  const buildingQuizFoundLabelsRef = useRef<string[]>([]);
  const buildingQuizQueueRef = useRef<string[]>([]);
  const buildingQuizLabelsRef = useRef<string[]>([]);
  const buildingQuizResultTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const buildingQuizTransitionIdRef = useRef(0);
  const buildingQuizTransitionAttemptRef = useRef(0);
  const buildingQuizMoveEndHandlerRef = useRef<((event: MapLibreEvent) => void) | null>(
    null
  );
  const buildingLabelUpdateFrameRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);
  const hasInitializedQuizRef = useRef(false);
  const hasInitializedBuildingQuizRef = useRef(false);
  const buildingViewRestoreRef = useRef<{
    center: [number, number];
    zoom: number;
    maxBounds: maplibregl.LngLatBounds | null;
    minZoom: number;
  } | null>(null);
  const tokenLabelOverrides =
    city === "montreal"
      ? MONTREAL_REF_LABEL_OVERRIDES
      : city === "ottawa"
        ? OTTAWA_REF_LABEL_OVERRIDES
        : city === "kingston"
          ? KINGSTON_NAME_LABEL_OVERRIDES
          : null;
  const effectiveActiveRoadTokens = useMemo(() => {
    if (city !== "ottawa" || includeGatineauRoads) {
      return activeRoadTokens;
    }
    return activeRoadTokens.filter(
      (token) => !GATINEAU_ROAD_TOKEN_SET.has(token)
    );
  }, [activeRoadTokens, city, includeGatineauRoads]);
  const effectiveQuizRoadTokens = useMemo(() => {
    if (city !== "ottawa" || includeGatineauRoads) {
      return quizRoadTokens;
    }
    return quizRoadTokens.filter(
      (token) => !GATINEAU_ROAD_TOKEN_SET.has(token)
    );
  }, [city, includeGatineauRoads, quizRoadTokens]);
  const buildingQuizLabels = useMemo(
    () => (city === "kingston" ? KINGSTON_BUILDING_DISPLAY_LABELS : []),
    [city]
  );

  const roadIndex = useMemo(
    () => (roadCatalog ? buildRoadIndex(roadCatalog) : null),
    [roadCatalog]
  );
  const aliasTokenByValue = useMemo(() => {
    const baseAliases = roadIndex?.aliasTokenByValue;
    const extraAliases = city === "ottawa" ? OTTAWA_ALIAS_TOKEN_BY_VALUE : null;
    if (!baseAliases && !extraAliases) return null;
    const merged = new Map<string, string>();
    if (baseAliases) {
      baseAliases.forEach((value, key) => merged.set(key, value));
    }
    if (extraAliases) {
      extraAliases.forEach((value, key) => merged.set(key, value));
    }
    return merged;
  }, [roadIndex, city]);
  const roadMatchIndex = useMemo(
    () =>
      roadIndex
        ? buildRoadMatchIndex(
            roadIndex,
            effectiveActiveRoadTokens,
            tokenLabelOverrides
          )
        : null,
    [roadIndex, effectiveActiveRoadTokens, tokenLabelOverrides]
  );
  const quizRoadMatchIndex = useMemo(
    () =>
      roadIndex
        ? buildRoadMatchIndex(
            roadIndex,
            effectiveQuizRoadTokens,
            tokenLabelOverrides
          )
        : null,
    [roadIndex, effectiveQuizRoadTokens, tokenLabelOverrides]
  );
  const quizFoundMatchIndex = useMemo(
    () =>
      roadIndex
        ? buildRoadMatchIndex(roadIndex, quizFoundTokens, tokenLabelOverrides)
        : null,
    [roadIndex, quizFoundTokens, tokenLabelOverrides]
  );
  const quizPromptLabel = useMemo(() => {
    if (!quizTargetToken) return null;
    return (
      quizRoadMatchIndex?.tokenLabels.get(quizTargetToken) ??
      tokenLabelOverrides?.get(quizTargetToken) ??
      quizTargetToken
    );
  }, [quizTargetToken, quizRoadMatchIndex, tokenLabelOverrides]);
  const quizColorOverrides = useMemo(() => {
    if (!quizCorrectTokens.length && !quizIncorrectTokens.length) {
      return null;
    }
    const overrides: Record<string, string> = {};
    quizCorrectTokens.forEach((token) => {
      overrides[token] = QUIZ_CORRECT_ROAD_COLOR;
    });
    quizIncorrectTokens.forEach((token) => {
      overrides[token] = QUIZ_INCORRECT_ROAD_COLOR;
    });
    return overrides;
  }, [quizCorrectTokens, quizIncorrectTokens]);
  const quizColorTokens = useMemo(() => {
    if (!quizFoundTokens.length) return quizFoundTokens;
    if (!quizIncorrectTokens.length) return quizFoundTokens;
    const incorrectSet = new Set(quizIncorrectTokens);
    const incorrect: string[] = [];
    const correct: string[] = [];
    quizFoundTokens.forEach((token) => {
      if (incorrectSet.has(token)) {
        incorrect.push(token);
      } else {
        correct.push(token);
      }
    });
    return [...incorrect, ...correct];
  }, [quizFoundTokens, quizIncorrectTokens]);
  const listedRoads = useMemo<VisibleRoad[]>(() => {
    const tokenLabels = roadMatchIndex?.tokenLabels;
    return [...effectiveActiveRoadTokens]
      .map((token) => ({
        token,
        label:
          tokenLabels?.get(token) ??
          tokenLabelOverrides?.get(token) ??
          token,
      }))
      .sort((a, b) => {
        const aIsHighway = isHighwayToken(a.token, a.label);
        const bIsHighway = isHighwayToken(b.token, b.label);
        if (aIsHighway !== bIsHighway) return aIsHighway ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [effectiveActiveRoadTokens, roadMatchIndex, tokenLabelOverrides]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const basePath = getBasePathname();
    const segment = CITY_PATH_SEGMENTS[city];
    const quizSegment = isBuildingQuizActive
      ? BUILDINGS_PATH_SEGMENT
      : isQuizActive
        ? QUIZ_PATH_SEGMENT
        : "";
    const targetPath = `/${[segment, quizSegment].filter(Boolean).join("/")}`;
    const currentPath = getRoutePathname();
    const url = new URL(window.location.href);
    if (
      normalizePathname(currentPath) === normalizePathname(targetPath) &&
      url.pathname === basePath
    ) {
      return;
    }
    url.pathname = basePath;
    url.hash = `${ROUTE_HASH_PREFIX}${targetPath.replace(/^\/+/, "")}`;
    window.history.replaceState(window.history.state, "", url.toString());
  }, [city, isBuildingQuizActive, isQuizActive]);

  useEffect(() => {
    const nextTokens = CITY_CONFIG[city].defaultTokens;
    setActiveRoadTokens(nextTokens);
    setQuizRoadTokens(nextTokens);
    setRoadInput("");
    setIsEditingRoads(false);
    setIncludeGatineauRoads(true);
    const nextQuizActive = isInitialLoadRef.current
      ? initialIsQuizActive
      : false;
    const nextBuildingQuizActive = isInitialLoadRef.current
      ? initialIsBuildingQuizActive
      : false;
    setIsQuizActive(nextQuizActive);
    setQuizTargetToken(null);
    setQuizFoundTokens([]);
    setQuizCorrectTokens([]);
    setQuizIncorrectTokens([]);
    setQuizMessage(null);
    setQuizQueue([]);
    setQuizCorrectCount(0);
    setQuizGuessCount(0);
    setQuizResultState("idle");
    setIsBuildingQuizActive(nextBuildingQuizActive);
    setBuildingQuizTargetLabel(null);
    setBuildingQuizFoundLabels([]);
    setBuildingQuizCorrectLabels([]);
    setBuildingQuizIncorrectLabels([]);
    setBuildingQuizMessage(null);
    setBuildingQuizQueue([]);
    setBuildingQuizCorrectCount(0);
    setBuildingQuizGuessCount(0);
    setBuildingQuizResultState("idle");

    quizRoadTokensRef.current = nextTokens;
    quizFoundTokensRef.current = [];
    quizQueueRef.current = [];
    quizAttemptedTokenRef.current = null;
    if (quizResultTimeoutRef.current) {
      clearTimeout(quizResultTimeoutRef.current);
      quizResultTimeoutRef.current = null;
    }
    buildingQuizFoundLabelsRef.current = [];
    buildingQuizQueueRef.current = [];
    buildingQuizAttemptLabelRef.current = null;
    buildingQuizLabelsRef.current = [];
    if (buildingQuizResultTimeoutRef.current) {
      clearTimeout(buildingQuizResultTimeoutRef.current);
      buildingQuizResultTimeoutRef.current = null;
    }
    hasInitializedBuildingQuizRef.current = false;
    buildingViewRestoreRef.current = null;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
    if (!nextQuizActive) {
      hasInitializedQuizRef.current = false;
    }
  }, [city]);

  const handleAddRoad = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const entries = roadInput
        .split(/[,\n]/)
        .map((entry) => normalizeRoadToken(entry))
        .filter(Boolean)
        .map((entry) => aliasTokenByValue?.get(entry) ?? entry);

      if (!entries.length) return;

      setActiveRoadTokens((prev) => {
        const next = new Set(prev);
        entries.forEach((entry) => next.add(entry));
        return Array.from(next);
      });
      setRoadInput("");
    },
    [roadInput, aliasTokenByValue]
  );

  const handleRemoveRoad = useCallback((token: string) => {
    setActiveRoadTokens((prev) => prev.filter((entry) => entry !== token));
  }, []);

  const clearQuizResultTimeout = useCallback(() => {
    if (quizResultTimeoutRef.current) {
      clearTimeout(quizResultTimeoutRef.current);
      quizResultTimeoutRef.current = null;
    }
  }, []);

  const showQuizResult = useCallback(
    (isCorrect: boolean) => {
      clearQuizResultTimeout();
      setQuizResultState(isCorrect ? "correct" : "incorrect");
      quizResultTimeoutRef.current = setTimeout(() => {
        setQuizResultState("idle");
        quizResultTimeoutRef.current = null;
      }, getQuizResultDuration());
    },
    [clearQuizResultTimeout]
  );

  const buildQuizQueue = useCallback(
    (excludeTokens: string[], roadTokens: string[]) => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !roadTokens.length) return [];
      const excludeSet = new Set(excludeTokens);
      const remainingTokens = roadTokens.filter(
        (token) => !excludeSet.has(token)
      );
      if (!remainingTokens.length) return [];
      return shuffleTokens(remainingTokens);
    },
    [mapLoaded]
  );

  const handleSkipRoad = useCallback(() => {
    if (!quizTargetToken) return;
    clearQuizResultTimeout();
    setQuizResultState("idle");
    const nextQueue = [...quizQueueRef.current, quizTargetToken];
    const [nextTarget, ...rest] = nextQueue;
    quizQueueRef.current = rest;
    setQuizQueue(rest);
    setQuizTargetToken(nextTarget ?? null);
    setQuizMessage(
      nextTarget
        ? null
        : getQuizEmptyMessage(quizCorrectCount, quizGuessCount)
    );
  }, [clearQuizResultTimeout, quizCorrectCount, quizGuessCount, quizTargetToken]);

  const stopQuiz = useCallback(() => {
    clearQuizResultTimeout();
    setQuizResultState("idle");
    setIsQuizActive(false);
    setQuizTargetToken(null);
    setQuizFoundTokens([]);
    setQuizCorrectTokens([]);
    setQuizIncorrectTokens([]);
    setQuizMessage(null);
    setQuizQueue([]);
    setQuizCorrectCount(0);
    setQuizGuessCount(0);
    quizFoundTokensRef.current = [];
    quizQueueRef.current = [];
    hasInitializedQuizRef.current = false;
  }, [clearQuizResultTimeout]);

  const startQuiz = useCallback(() => {
    clearQuizResultTimeout();
    setQuizResultState("idle");
    const nextQuizTokens = [...effectiveActiveRoadTokens];
    quizRoadTokensRef.current = nextQuizTokens;
    setQuizRoadTokens(nextQuizTokens);
    setIsQuizActive(true);
    setQuizFoundTokens([]);
    setQuizCorrectTokens([]);
    setQuizIncorrectTokens([]);
    const nextQueue = buildQuizQueue([], nextQuizTokens);
    setQuizTargetToken(nextQueue[0] ?? null);
    setQuizQueue(nextQueue.slice(1));
    quizFoundTokensRef.current = [];
    quizQueueRef.current = nextQueue.slice(1);
    setQuizMessage(
      nextQueue.length
        ? null
        : mapLoaded
          ? getQuizEmptyMessage(0, 0)
          : "Map is still loading. Try again in a moment."
    );
    setQuizCorrectCount(0);
    setQuizGuessCount(0);
    hasInitializedQuizRef.current = true;
  }, [
    buildQuizQueue,
    clearQuizResultTimeout,
    effectiveActiveRoadTokens,
    mapLoaded,
  ]);

  const clearBuildingQuizResultTimeout = useCallback(() => {
    if (buildingQuizResultTimeoutRef.current) {
      clearTimeout(buildingQuizResultTimeoutRef.current);
      buildingQuizResultTimeoutRef.current = null;
    }
  }, []);

  const showBuildingQuizResult = useCallback(
    (isCorrect: boolean) => {
      clearBuildingQuizResultTimeout();
      setBuildingQuizResultState(isCorrect ? "correct" : "incorrect");
      buildingQuizResultTimeoutRef.current = setTimeout(() => {
        setBuildingQuizResultState("idle");
        buildingQuizResultTimeoutRef.current = null;
      }, getQuizResultDuration());
    },
    [clearBuildingQuizResultTimeout]
  );

  const lockKingstonCampusView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = getKingstonCampusZoom();
    if (!buildingViewRestoreRef.current) {
      const center = map.getCenter();
      buildingViewRestoreRef.current = {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        maxBounds: map.getMaxBounds(),
        minZoom: map.getMinZoom(),
      };
    }
    const applyDefaultBounds = () => {
      map.setMaxBounds(CITY_CONFIG.kingston.mapBounds);
      map.setMinZoom(ROAD_TILE_MIN_ZOOM);
    };
    const currentCenter = map.getCenter();
    const needsMove =
      Math.abs(currentCenter.lng - KINGSTON_CAMPUS_CENTER[0]) > 0.0001 ||
      Math.abs(currentCenter.lat - KINGSTON_CAMPUS_CENTER[1]) > 0.0001 ||
      Math.abs(map.getZoom() - targetZoom) > 0.01;
    if (!needsMove) {
      applyDefaultBounds();
      return;
    }
    map.stop();
    map.setMaxBounds(null);
    map.setMinZoom(ROAD_TILE_MIN_ZOOM);
    const transitionId = buildingQuizTransitionIdRef.current + 1;
    buildingQuizTransitionIdRef.current = transitionId;
    buildingQuizTransitionAttemptRef.current = 0;
    if (buildingQuizMoveEndHandlerRef.current) {
      map.off("moveend", buildingQuizMoveEndHandlerRef.current);
      buildingQuizMoveEndHandlerRef.current = null;
    }
    const handleMoveEnd = (event: MapLibreEvent) => {
      const eventData = event as MapLibreEvent & {
        campusTransitionId?: number;
      };
      const center = map.getCenter();
      const isAtTarget =
        Math.abs(center.lng - KINGSTON_CAMPUS_CENTER[0]) < 0.0002 &&
        Math.abs(center.lat - KINGSTON_CAMPUS_CENTER[1]) < 0.0002 &&
        Math.abs(map.getZoom() - targetZoom) < 0.02;
      const isTransitionEvent = eventData.campusTransitionId === transitionId;
      if (!isTransitionEvent && !isAtTarget) {
        return;
      }
      if (!isAtTarget) {
        if (buildingQuizTransitionAttemptRef.current >= 1) {
          map.jumpTo({
            center: KINGSTON_CAMPUS_CENTER,
            zoom: targetZoom,
          });
          map.off("moveend", handleMoveEnd);
          buildingQuizMoveEndHandlerRef.current = null;
          applyDefaultBounds();
          return;
        }
        buildingQuizTransitionAttemptRef.current += 1;
        map.easeTo({
          center: KINGSTON_CAMPUS_CENTER,
          zoom: targetZoom,
          duration: 500,
          essential: true,
        }, { campusTransitionId: transitionId });
        return;
      }
      map.off("moveend", handleMoveEnd);
      buildingQuizMoveEndHandlerRef.current = null;
      applyDefaultBounds();
    };
    buildingQuizMoveEndHandlerRef.current = handleMoveEnd;
    map.on("moveend", handleMoveEnd);
    map.easeTo({
      center: KINGSTON_CAMPUS_CENTER,
      zoom: targetZoom,
      duration: 900,
      essential: true,
    }, { campusTransitionId: transitionId });
  }, []);

  const restoreMapViewFromBuildingQuiz = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const restore = buildingViewRestoreRef.current;
    const fallback = CITY_CONFIG[city];
    const center = restore?.center ?? fallback.center;
    const zoom = restore?.zoom ?? fallback.zoom;
    const maxBounds = restore?.maxBounds ?? fallback.mapBounds;
    const minZoom = restore?.minZoom ?? ROAD_TILE_MIN_ZOOM;
    map.setMaxBounds(maxBounds);
    map.setMinZoom(minZoom);
    map.flyTo({ center, zoom });
    buildingViewRestoreRef.current = null;
  }, [city]);

  const updateBuildingLabelSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || city !== "kingston") return;
    if (!map.getLayer(BUILDING_FILL_LAYER_ID)) return;
    const labelSource = map.getSource(BUILDING_LABEL_SOURCE_ID);
    if (!labelSource) return;
    const features = map.queryRenderedFeatures({
      layers: [BUILDING_FILL_LAYER_ID],
    });
    const allowedLabels = isBuildingQuizActive
      ? new Set(buildingQuizFoundLabels)
      : null;
    const data = buildBuildingLabelFeatureCollection(features, allowedLabels);
    (labelSource as GeoJSONSource).setData(data);
  }, [buildingQuizFoundLabels, city, isBuildingQuizActive, mapLoaded]);

  const scheduleBuildingLabelUpdate = useCallback(() => {
    if (typeof window === "undefined") return;
    if (buildingLabelUpdateFrameRef.current !== null) return;
    buildingLabelUpdateFrameRef.current = window.requestAnimationFrame(() => {
      buildingLabelUpdateFrameRef.current = null;
      updateBuildingLabelSource();
    });
  }, [updateBuildingLabelSource]);

  const handleSkipBuilding = useCallback(() => {
    if (!buildingQuizTargetLabel) return;
    clearBuildingQuizResultTimeout();
    setBuildingQuizResultState("idle");
    const nextQueue = [
      ...buildingQuizQueueRef.current,
      buildingQuizTargetLabel,
    ];
    const [nextTarget, ...rest] = nextQueue;
    buildingQuizQueueRef.current = rest;
    setBuildingQuizQueue(rest);
    setBuildingQuizTargetLabel(nextTarget ?? null);
    setBuildingQuizMessage(
      nextTarget
        ? null
        : getBuildingQuizEmptyMessage(
            buildingQuizCorrectCount,
            buildingQuizGuessCount
          )
    );
  }, [
    buildingQuizCorrectCount,
    buildingQuizGuessCount,
    buildingQuizTargetLabel,
    clearBuildingQuizResultTimeout,
  ]);

  const stopBuildingQuiz = useCallback(() => {
    clearBuildingQuizResultTimeout();
    setBuildingQuizResultState("idle");
    setIsBuildingQuizActive(false);
    setBuildingQuizTargetLabel(null);
    setBuildingQuizFoundLabels([]);
    setBuildingQuizCorrectLabels([]);
    setBuildingQuizIncorrectLabels([]);
    setBuildingQuizMessage(null);
    setBuildingQuizQueue([]);
    setBuildingQuizCorrectCount(0);
    setBuildingQuizGuessCount(0);
    buildingQuizFoundLabelsRef.current = [];
    buildingQuizQueueRef.current = [];
    buildingQuizAttemptLabelRef.current = null;
    hasInitializedBuildingQuizRef.current = false;
    const map = mapRef.current;
    if (map && buildingQuizMoveEndHandlerRef.current) {
      map.off("moveend", buildingQuizMoveEndHandlerRef.current);
      buildingQuizMoveEndHandlerRef.current = null;
    }
    restoreMapViewFromBuildingQuiz();
  }, [clearBuildingQuizResultTimeout, restoreMapViewFromBuildingQuiz]);

  const startBuildingQuiz = useCallback(() => {
    if (city !== "kingston") return;
    clearBuildingQuizResultTimeout();
    setBuildingQuizResultState("idle");
    const nextBuildingLabels = [...buildingQuizLabels];
    buildingQuizLabelsRef.current = nextBuildingLabels;
    setIsBuildingQuizActive(true);
    setBuildingQuizFoundLabels([]);
    setBuildingQuizCorrectLabels([]);
    setBuildingQuizIncorrectLabels([]);
    const nextQueue = buildQuizQueue([], nextBuildingLabels);
    setBuildingQuizTargetLabel(nextQueue[0] ?? null);
    setBuildingQuizQueue(nextQueue.slice(1));
    buildingQuizFoundLabelsRef.current = [];
    buildingQuizQueueRef.current = nextQueue.slice(1);
    setBuildingQuizMessage(
      nextQueue.length
        ? null
        : mapLoaded
          ? getBuildingQuizEmptyMessage(0, 0)
          : "Map is still loading. Try again in a moment."
    );
    setBuildingQuizCorrectCount(0);
    setBuildingQuizGuessCount(0);
    hasInitializedBuildingQuizRef.current = true;
    lockKingstonCampusView();
  }, [
    buildQuizQueue,
    buildingQuizLabels,
    city,
    clearBuildingQuizResultTimeout,
    lockKingstonCampusView,
    mapLoaded,
  ]);

  const handleQuizToggle = useCallback(() => {
    if (isQuizActive) {
      stopQuiz();
      return;
    }
    if (isBuildingQuizActive) {
      stopBuildingQuiz();
    }
    startQuiz();
  }, [isBuildingQuizActive, isQuizActive, startQuiz, stopBuildingQuiz, stopQuiz]);

  const handleBuildingQuizToggle = useCallback(() => {
    if (isBuildingQuizActive) {
      stopBuildingQuiz();
      return;
    }
    if (isQuizActive) {
      stopQuiz();
    }
    startBuildingQuiz();
  }, [
    isBuildingQuizActive,
    isQuizActive,
    startBuildingQuiz,
    stopBuildingQuiz,
    stopQuiz,
  ]);

  useEffect(() => {
    if (isQuizActive && isBuildingQuizActive) {
      stopBuildingQuiz();
    }
  }, [isBuildingQuizActive, isQuizActive, stopBuildingQuiz]);

  useEffect(() => {
    let cancelled = false;
    setRoadCatalog(null);
    setIsCatalogLoading(true);

    const loadCatalog = async () => {
      try {
        const response = await fetch(getRoadCatalogUrl(city));
        if (!response.ok) {
          throw new Error(`Road catalog request failed: ${response.status}`);
        }
        const data = (await response.json()) as RoadCatalog;
        if (cancelled) return;
        setRoadCatalog(data);
        setIsCatalogLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Road catalog error:", error);
        setIsCatalogLoading(false);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const rasterScale = getRasterScale();
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: buildRasterStyle(rasterScale) as any,
      center: CITY_CONFIG[initialCity].center,
      zoom: CITY_CONFIG[initialCity].zoom,
      maxBounds: CITY_CONFIG[initialCity].mapBounds,
      minZoom: ROAD_TILE_MIN_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    roadSourceContentSeenRef.current = false;
    setRoadsLoading(true);
    let resizeRaf = 0;
    const scheduleResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        map.resize();
      });
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => scheduleResize());
    if (resizeObserver) {
      resizeObserver.observe(mapContainer.current);
    }
    const visualViewport = window.visualViewport ?? null;
    visualViewport?.addEventListener("resize", scheduleResize);
    visualViewport?.addEventListener("scroll", scheduleResize);
    scheduleResize();

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId !== ROAD_SOURCE_ID) return;
      if (event.sourceDataType === "content") {
        roadSourceContentSeenRef.current = true;
      }
      if (!roadSourceContentSeenRef.current) return;
      if (!event.isSourceLoaded) return;
      setRoadsLoading(false);
    };

    const handleLoad = () => {
      setMapLoaded(true);
      const defaultLineColor = buildRoadColorExpression(initialTokens);
      const defaultFilterOverrides = getRoadFilterOverrides(
        initialCity,
        initialTokens
      );
      const defaultGlobalFilters = getRoadGlobalFilters(initialCity, true);
      const defaultHighwayRefs = getHighwayRefTokens(initialCity);
      const defaultFilter = buildRoadFilter(
        initialTokens,
        undefined,
        defaultFilterOverrides,
        defaultGlobalFilters,
        { highwayRefTokens: defaultHighwayRefs }
      );
      const defaultLabelText = buildRoadLabelTextExpression(initialCity, {
        useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
          initialCity,
          initialTokens
        ),
      });
      ensureRoadLayer(
        map,
        initialCity,
        defaultFilter,
        defaultLineColor,
        buildContrastingTextColorExpression(defaultLineColor),
        defaultLabelText
      );
      ensureBuildingLayer(map, initialCity);
      mapCityRef.current = initialCity;
    };

    map.on("load", handleLoad);
    map.on("sourcedata", handleSourceData);
    map.on("error", (e) => {
      console.error("Map Error:", e);
    });

    return () => {
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }
      resizeObserver?.disconnect();
      visualViewport?.removeEventListener("resize", scheduleResize);
      visualViewport?.removeEventListener("scroll", scheduleResize);
      map.off("load", handleLoad);
      map.off("sourcedata", handleSourceData);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (mapCityRef.current === city) return;

    roadSourceContentSeenRef.current = false;
    setRoadsLoading(true);
    const nextTokens = CITY_CONFIG[city].defaultTokens;
    const nextLineColor = buildRoadColorExpression(nextTokens);
    const nextFilterOverrides = getRoadFilterOverrides(city, nextTokens);
    const nextGlobalFilters = getRoadGlobalFilters(city, true);
    const nextHighwayRefs = getHighwayRefTokens(city);
    const nextFilter = buildRoadFilter(
      nextTokens,
      undefined,
      nextFilterOverrides,
      nextGlobalFilters,
      { highwayRefTokens: nextHighwayRefs }
    );
    const nextLabelText = buildRoadLabelTextExpression(city, {
      useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
        city,
        nextTokens
      ),
    });
    resetRoadSource(
      map,
      city,
      nextFilter,
      nextLineColor,
      buildContrastingTextColorExpression(nextLineColor),
      nextLabelText
    );
    resetBuildingSource(map, city);
    mapCityRef.current = city;
  }, [city, mapLoaded]);

  // Update Filters on change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const highlightTokens = isQuizActive
      ? effectiveQuizRoadTokens
      : effectiveActiveRoadTokens;
    const highlightMatchIndex = isQuizActive
      ? quizRoadMatchIndex
      : roadMatchIndex;
    const labelTokens = isQuizActive ? quizFoundTokens : effectiveActiveRoadTokens;
    const labelMatchIndex = isQuizActive ? quizFoundMatchIndex : roadMatchIndex;

    const filterOverrides = getRoadFilterOverrides(city, highlightTokens);
    const globalFilters = getRoadGlobalFilters(city, includeGatineauRoads);
    const highwayRefs = getHighwayRefTokens(city);
    const filter = buildRoadFilter(
      highlightTokens,
      highlightMatchIndex,
      filterOverrides,
      globalFilters,
      { highwayRefTokens: highwayRefs }
    );
    const isBuildingQuizMode = isBuildingQuizActive && !isQuizActive;
    const baseLineColor = isQuizActive
      ? buildRoadColorExpression(
          quizColorTokens,
          quizFoundMatchIndex,
          QUIZ_BASE_ROAD_COLOR,
          quizColorOverrides ?? undefined
        )
      : buildRoadColorExpression(effectiveActiveRoadTokens, roadMatchIndex);
    const lineColor = isBuildingQuizMode ? BUILDING_QUIZ_ROAD_COLOR : baseLineColor;
    const labelFilterOverrides = getRoadFilterOverrides(city, labelTokens);
    const labelGlobalFilters = getRoadGlobalFilters(city, includeGatineauRoads);
    const labelFilter = isQuizActive
      ? buildRoadFilter(
          labelTokens,
          labelMatchIndex,
          labelFilterOverrides,
          labelGlobalFilters,
          { highwayRefTokens: highwayRefs }
        )
      : filter;
    const textColor = buildContrastingTextColorExpression(lineColor);
    const labelOpacity = isQuizActive
      ? buildRoadOpacityExpression(labelTokens, labelMatchIndex, 0)
      : 1;
    const labelHaloColor = lineColor;
    const labelHaloWidth = isQuizActive
      ? (["*", labelOpacity, 2] as ExpressionSpecification)
      : 2;
    const labelTextExpression = buildRoadLabelTextExpression(city, {
      useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
        city,
        labelTokens
      ),
    });
    const labelTextSize = isBuildingQuizMode
      ? BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION
      : ROAD_LABEL_SIZE_EXPRESSION;

    if (map.getLayer(ROAD_LAYER_ID)) {
      map.setFilter(ROAD_LAYER_ID, filter);
      map.setPaintProperty(ROAD_LAYER_ID, "line-color", lineColor);
    }
    if (map.getLayer(ROAD_LABEL_LAYER_ID)) {
      map.setFilter(ROAD_LABEL_LAYER_ID, labelFilter);
      map.setLayoutProperty(ROAD_LABEL_LAYER_ID, "text-field", labelTextExpression);
      map.setLayoutProperty(ROAD_LABEL_LAYER_ID, "text-size", labelTextSize);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-color", textColor);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-halo-color", labelHaloColor);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-opacity", labelOpacity);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-halo-width", labelHaloWidth);
    }
  }, [
    city,
    effectiveActiveRoadTokens,
    effectiveQuizRoadTokens,
    includeGatineauRoads,
    isBuildingQuizActive,
    isQuizActive,
    mapLoaded,
    quizColorTokens,
    quizFoundMatchIndex,
    quizFoundTokens,
    quizColorOverrides,
    quizRoadMatchIndex,
    roadMatchIndex,
  ]);

  const refreshQuizTarget = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isQuizActive || quizTargetToken) return;

    if (quizQueue.length) {
      const [nextTarget, ...rest] = quizQueue;
      setQuizTargetToken(nextTarget);
      setQuizQueue(rest);
      setQuizMessage(null);
      return;
    }

    const nextQueue = buildQuizQueue(
      quizFoundTokens,
      quizRoadTokensRef.current
    );
    if (!nextQueue.length) {
      setQuizMessage(getQuizEmptyMessage(quizCorrectCount, quizGuessCount));
      return;
    }
    setQuizTargetToken(nextQueue[0]);
    setQuizQueue(nextQueue.slice(1));
    setQuizMessage(null);
  }, [
    buildQuizQueue,
    isQuizActive,
    mapLoaded,
    quizCorrectCount,
    quizFoundTokens,
    quizGuessCount,
    quizQueue,
    quizTargetToken,
  ]);

  useEffect(() => {
    refreshQuizTarget();
  }, [refreshQuizTarget]);

  useEffect(() => {
    if (!isQuizActive || hasInitializedQuizRef.current) return;
    startQuiz();
  }, [isQuizActive, startQuiz]);

  useEffect(() => {
    quizRoadTokensRef.current = effectiveQuizRoadTokens;
  }, [effectiveQuizRoadTokens]);

  useEffect(() => {
    quizFoundTokensRef.current = quizFoundTokens;
  }, [quizFoundTokens]);

  useEffect(() => {
    quizQueueRef.current = quizQueue;
  }, [quizQueue]);

  useEffect(() => {
    buildingQuizLabelsRef.current = buildingQuizLabels;
  }, [buildingQuizLabels]);

  useEffect(() => {
    buildingQuizFoundLabelsRef.current = buildingQuizFoundLabels;
  }, [buildingQuizFoundLabels]);

  useEffect(() => {
    buildingQuizQueueRef.current = buildingQuizQueue;
  }, [buildingQuizQueue]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || city !== "kingston") return;
    if (!map.getLayer(BUILDING_FILL_LAYER_ID)) return;
    const baseColor = isBuildingQuizActive
      ? KINGSTON_BUILDING_QUIZ_BASE_COLOR
      : isQuizActive
        ? KINGSTON_BUILDING_ROAD_QUIZ_COLOR
        : KINGSTON_BUILDING_COLOR_EXPRESSION;
    const fillColor = isBuildingQuizActive
      ? buildBuildingQuizColorExpression(
          BUILDING_LABEL_DISPLAY_EXPRESSION,
          buildingQuizCorrectLabels,
          buildingQuizIncorrectLabels,
          baseColor
        )
      : baseColor;
    map.setPaintProperty(BUILDING_FILL_LAYER_ID, "fill-color", fillColor);
    const fillOpacity = isBuildingQuizActive
      ? KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION
      : isQuizActive
        ? KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION
        : KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION;
    map.setPaintProperty(BUILDING_FILL_LAYER_ID, "fill-opacity", fillOpacity);
    if (map.getLayer(BUILDING_OUTLINE_LAYER_ID)) {
      const outlineColor = isBuildingQuizActive
        ? KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR
        : isQuizActive
          ? KINGSTON_BUILDING_ROAD_QUIZ_COLOR
          : KINGSTON_BUILDING_COLOR_EXPRESSION;
      map.setPaintProperty(BUILDING_OUTLINE_LAYER_ID, "line-color", outlineColor);
      map.setPaintProperty(
        BUILDING_OUTLINE_LAYER_ID,
        "line-opacity",
        KINGSTON_BUILDING_OUTLINE_OPACITY
      );
    }
    if (map.getLayer(BUILDING_LABEL_LAYER_ID)) {
      const labelHaloColor = isBuildingQuizActive
        ? buildBuildingQuizColorExpression(
            ["get", "label"],
            buildingQuizCorrectLabels,
            buildingQuizIncorrectLabels,
            KINGSTON_BUILDING_LABEL_HALO_COLOR
          )
        : KINGSTON_BUILDING_LABEL_HALO_COLOR;
      map.setPaintProperty(
        BUILDING_LABEL_LAYER_ID,
        "text-halo-color",
        labelHaloColor
      );
    }
  }, [
    buildingQuizCorrectLabels,
    buildingQuizIncorrectLabels,
    city,
    isBuildingQuizActive,
    isQuizActive,
    mapLoaded,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || city !== "kingston") return;
    if (!map.getSource(BUILDING_LABEL_SOURCE_ID)) return;

    scheduleBuildingLabelUpdate();

    const handleMoveEnd = () => scheduleBuildingLabelUpdate();
    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId !== BUILDING_SOURCE_ID) return;
      if (event.sourceDataType !== "content") return;
      if (!event.isSourceLoaded) return;
      scheduleBuildingLabelUpdate();
    };

    map.on("moveend", handleMoveEnd);
    map.on("sourcedata", handleSourceData);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("sourcedata", handleSourceData);
      if (buildingLabelUpdateFrameRef.current !== null) {
        cancelAnimationFrame(buildingLabelUpdateFrameRef.current);
        buildingLabelUpdateFrameRef.current = null;
      }
    };
  }, [city, mapLoaded, scheduleBuildingLabelUpdate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const buildingLabelVisibility = isQuizActive ? "none" : "visible";
    const fieldLabelVisibility =
      isQuizActive || isBuildingQuizActive ? "none" : "visible";
    if (map.getLayer(BUILDING_LABEL_LAYER_ID)) {
      map.setLayoutProperty(
        BUILDING_LABEL_LAYER_ID,
        "visibility",
        buildingLabelVisibility
      );
    }
    if (map.getLayer(KINGSTON_FIELD_LABEL_LAYER_ID)) {
      map.setLayoutProperty(
        KINGSTON_FIELD_LABEL_LAYER_ID,
        "visibility",
        fieldLabelVisibility
      );
    }
  }, [city, isBuildingQuizActive, isQuizActive, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || city !== "kingston") return;
    scheduleBuildingLabelUpdate();
  }, [
    buildingQuizFoundLabels,
    city,
    isBuildingQuizActive,
    mapLoaded,
    scheduleBuildingLabelUpdate,
  ]);

  useEffect(() => {
    quizAttemptedTokenRef.current = null;
  }, [quizTargetToken]);

  useEffect(() => {
    buildingQuizAttemptLabelRef.current = null;
  }, [buildingQuizTargetLabel]);

  useEffect(() => {
    return () => {
      clearQuizResultTimeout();
    };
  }, [clearQuizResultTimeout]);

  useEffect(() => {
    return () => {
      clearBuildingQuizResultTimeout();
    };
  }, [clearBuildingQuizResultTimeout]);

  useEffect(() => {
    if (!isBuildingQuizActive || hasInitializedBuildingQuizRef.current) return;
    startBuildingQuiz();
  }, [isBuildingQuizActive, startBuildingQuiz]);

  useEffect(() => {
    if (!isBuildingQuizActive || city !== "kingston" || !mapLoaded) return;
    lockKingstonCampusView();
  }, [city, isBuildingQuizActive, lockKingstonCampusView, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isQuizActive) return;

    map.on("moveend", refreshQuizTarget);
    return () => {
      map.off("moveend", refreshQuizTarget);
    };
  }, [isQuizActive, mapLoaded, refreshQuizTarget]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isQuizActive || !quizTargetToken) return;

    const tokenParts = getFoldedTokenParts(quizTargetToken);
    const handleRoadClick = (event: MapMouseEvent) => {
      // Make quiz clicks a bit more forgiving by expanding the hit area around the cursor.
      const QUIZ_HITBOX_PX = 10; // tweak: 8–14

      const { x, y } = event.point;
      const bbox: [[number, number], [number, number]] = [
        [x - QUIZ_HITBOX_PX, y - QUIZ_HITBOX_PX],
        [x + QUIZ_HITBOX_PX, y + QUIZ_HITBOX_PX],
      ];

      const features = map.queryRenderedFeatures(bbox, { layers: [ROAD_LAYER_ID] });
      if (!features.length) return;
      if (quizFoundTokensRef.current.includes(quizTargetToken)) return;
      if (quizAttemptedTokenRef.current === quizTargetToken) return;
      quizAttemptedTokenRef.current = quizTargetToken;

      const matchedTokens = getQuizFeatureTokens(features, quizRoadMatchIndex);
      const isMatch =
        matchedTokens.has(quizTargetToken) ||
        features.some((feature) =>
          featureMatchesToken(feature, tokenParts, quizTargetToken)
        );
      const nextGuessCount = quizGuessCount + 1;
      const nextCorrectCount = quizCorrectCount + (isMatch ? 1 : 0);

      showQuizResult(isMatch);
      setQuizGuessCount((count) => count + 1);
      if (isMatch) {
        setQuizCorrectCount((count) => count + 1);
        setQuizCorrectTokens((tokens) =>
          tokens.includes(quizTargetToken)
            ? tokens
            : [...tokens, quizTargetToken]
        );
      } else {
        setQuizIncorrectTokens((tokens) =>
          tokens.includes(quizTargetToken)
            ? tokens
            : [...tokens, quizTargetToken]
        );
      }

      const nextFound = [...quizFoundTokensRef.current, quizTargetToken];
      quizFoundTokensRef.current = nextFound;
      setQuizFoundTokens(nextFound);

      let nextTarget: string | null = null;
      let nextQueue = quizQueueRef.current;
      if (nextQueue.length) {
        [nextTarget, ...nextQueue] = nextQueue;
      } else {
        const refreshedQueue = buildQuizQueue(
          nextFound,
          quizRoadTokensRef.current
        );
        if (refreshedQueue.length) {
          [nextTarget, ...nextQueue] = refreshedQueue;
        }
      }
      quizQueueRef.current = nextQueue;
      setQuizQueue(nextQueue);
      setQuizTargetToken(nextTarget);
      setQuizMessage(
        nextTarget
          ? null
          : getQuizEmptyMessage(nextCorrectCount, nextGuessCount)
      );
    };

    // Listen for any click on the map, then pick the closest rendered road within the hitbox.
    map.on("click", handleRoadClick);
    return () => {
      map.off("click", handleRoadClick);
    };
  }, [
    buildQuizQueue,
    isQuizActive,
    mapLoaded,
    quizCorrectCount,
    quizGuessCount,
    quizRoadMatchIndex,
    quizTargetToken,
    showQuizResult,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isBuildingQuizActive || !buildingQuizTargetLabel) {
      return;
    }

    const handleBuildingClick = (event: MapMouseEvent) => {
      const QUIZ_HITBOX_PX = 10;
      const { x, y } = event.point;
      const bbox: [[number, number], [number, number]] = [
        [x - QUIZ_HITBOX_PX, y - QUIZ_HITBOX_PX],
        [x + QUIZ_HITBOX_PX, y + QUIZ_HITBOX_PX],
      ];

      const features = map.queryRenderedFeatures(bbox, {
        layers: [BUILDING_FILL_LAYER_ID],
      });
      if (!features.length) return;
      if (buildingQuizFoundLabelsRef.current.includes(buildingQuizTargetLabel)) {
        return;
      }
      if (buildingQuizAttemptLabelRef.current === buildingQuizTargetLabel) {
        return;
      }
      buildingQuizAttemptLabelRef.current = buildingQuizTargetLabel;

      const isMatch = features.some((feature) =>
        buildingFeatureMatchesLabel(feature, buildingQuizTargetLabel)
      );
      const nextGuessCount = buildingQuizGuessCount + 1;
      const nextCorrectCount = buildingQuizCorrectCount + (isMatch ? 1 : 0);

      showBuildingQuizResult(isMatch);
      setBuildingQuizGuessCount((count) => count + 1);
      if (isMatch) {
        setBuildingQuizCorrectCount((count) => count + 1);
        setBuildingQuizCorrectLabels((labels) =>
          labels.includes(buildingQuizTargetLabel)
            ? labels
            : [...labels, buildingQuizTargetLabel]
        );
      }
      if (!isMatch) {
        setBuildingQuizIncorrectLabels((labels) =>
          labels.includes(buildingQuizTargetLabel)
            ? labels
            : [...labels, buildingQuizTargetLabel]
        );
      }

      const nextFound = [
        ...buildingQuizFoundLabelsRef.current,
        buildingQuizTargetLabel,
      ];
      buildingQuizFoundLabelsRef.current = nextFound;
      setBuildingQuizFoundLabels(nextFound);

      let nextTarget: string | null = null;
      let nextQueue = buildingQuizQueueRef.current;
      if (nextQueue.length) {
        [nextTarget, ...nextQueue] = nextQueue;
      } else {
        const refreshedQueue = buildQuizQueue(
          nextFound,
          buildingQuizLabelsRef.current
        );
        if (refreshedQueue.length) {
          [nextTarget, ...nextQueue] = refreshedQueue;
        }
      }
      buildingQuizQueueRef.current = nextQueue;
      setBuildingQuizQueue(nextQueue);
      setBuildingQuizTargetLabel(nextTarget);
      setBuildingQuizMessage(
        nextTarget
          ? null
          : getBuildingQuizEmptyMessage(nextCorrectCount, nextGuessCount)
      );
    };

    map.on("click", handleBuildingClick);
    return () => {
      map.off("click", handleBuildingClick);
    };
  }, [
    buildQuizQueue,
    buildingQuizCorrectCount,
    buildingQuizGuessCount,
    buildingQuizTargetLabel,
    isBuildingQuizActive,
    mapLoaded,
    showBuildingQuizResult,
  ]);

  // Handle City Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { center, zoom, mapBounds } = CITY_CONFIG[city];
    map.setMaxBounds(mapBounds);
    map.setMinZoom(ROAD_TILE_MIN_ZOOM);
    map.flyTo({ center, zoom });
  }, [city]);

  const activeCity = CITY_CONFIG[city];
  const roadQuizButtonLabel = city === "kingston" ? "Roads Quiz" : "Start Quiz";
  const roadQuizScoreText = `${quizCorrectCount}/${quizGuessCount}`;
  const isRoadFinalScore =
    !quizTargetToken &&
    quizGuessCount > 0 &&
    quizMessage?.startsWith("Final score") === true;
  const roadQuizPanelLabel = isRoadFinalScore ? "Final score" : "Find";
  const roadQuizPanelState =
    quizTargetToken || isRoadFinalScore ? "ready" : "empty";
  const roadQuizPanelValue =
    quizPromptLabel ??
    (isRoadFinalScore
      ? roadQuizScoreText
      : quizMessage ?? "Pan or zoom to load a prompt.");
  const roadQuizScoreLabel =
    quizResultState === "correct"
      ? "Correct!"
      : quizResultState === "incorrect"
        ? "Incorrect."
        : "Score";
  const buildingQuizScoreText = `${buildingQuizCorrectCount}/${buildingQuizGuessCount}`;
  const isBuildingFinalScore =
    !buildingQuizTargetLabel &&
    buildingQuizGuessCount > 0 &&
    buildingQuizMessage?.startsWith("Final score") === true;
  const buildingQuizPanelLabel = isBuildingFinalScore ? "Final score" : "Find";
  const buildingQuizPanelState =
    buildingQuizTargetLabel || isBuildingFinalScore ? "ready" : "empty";
  const buildingQuizPanelValue =
    buildingQuizTargetLabel ??
    (isBuildingFinalScore
      ? buildingQuizScoreText
      : buildingQuizMessage ?? "Pan or zoom to load a prompt.");
  const buildingQuizScoreLabel =
    buildingQuizResultState === "correct"
      ? "Correct!"
      : buildingQuizResultState === "incorrect"
        ? "Incorrect."
        : "Score";
  const showRoadsLoading = roadsLoading || isCatalogLoading;
  const activeQuiz = isQuizActive
    ? {
        isFinalScore: isRoadFinalScore,
        panelLabel: roadQuizPanelLabel,
        panelState: roadQuizPanelState,
        panelValue: roadQuizPanelValue,
        scoreLabel: roadQuizScoreLabel,
        scoreText: roadQuizScoreText,
        resultState: quizResultState,
        hasTarget: Boolean(quizTargetToken),
        onSkip: handleSkipRoad,
        onEnd: handleQuizToggle,
        skipLabel: "Skip Road",
      }
    : isBuildingQuizActive
      ? {
          isFinalScore: isBuildingFinalScore,
          panelLabel: buildingQuizPanelLabel,
          panelState: buildingQuizPanelState,
          panelValue: buildingQuizPanelValue,
          scoreLabel: buildingQuizScoreLabel,
          scoreText: buildingQuizScoreText,
          resultState: buildingQuizResultState,
          hasTarget: Boolean(buildingQuizTargetLabel),
          onSkip: handleSkipBuilding,
          onEnd: handleBuildingQuizToggle,
          skipLabel: "Skip Building",
        }
      : null;

  return (
    <div className="app-shell">
      <div ref={mapContainer} className="map-canvas" />
      {showRoadsLoading && (
        <div className="roads-loading" role="status" aria-live="polite">
          Roads loading...
        </div>
      )}
      <aside
        className="control-panel"
        data-collapsed={isPanelCollapsed ? "true" : "false"}
      >
        {activeQuiz ? (
          <div className="quiz-only">
            <div
              className="quiz-panel"
              data-state={activeQuiz.panelState}
            >
              <span className="quiz-label">{activeQuiz.panelLabel}</span>
              <span className="quiz-value">
                {activeQuiz.panelValue}
              </span>
              {!activeQuiz.isFinalScore && (
                <div
                  className="quiz-score-inline"
                  data-state={activeQuiz.resultState}
                >
                  <span className="quiz-score-label">
                    {activeQuiz.scoreLabel}
                  </span>
                  <span className="quiz-score-value">
                    {activeQuiz.scoreText}
                  </span>
                </div>
              )}
            </div>
            {!activeQuiz.isFinalScore && (
              <div className="quiz-score" data-state={activeQuiz.resultState}>
                <span className="quiz-score-label">
                  {activeQuiz.scoreLabel}
                </span>
                <span className="quiz-score-value">{activeQuiz.scoreText}</span>
              </div>
            )}
            <div className="quiz-controls">
              <button
                type="button"
                className="quiz-skip"
                onClick={activeQuiz.onSkip}
                disabled={!activeQuiz.hasTarget}
              >
                {activeQuiz.skipLabel}
              </button>
              <button
                type="button"
                className="quiz-end"
                onClick={activeQuiz.onEnd}
              >
                End Quiz
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="panel-header">
              <p className="eyebrow">Road Learning Tool</p>
              <h1>{activeCity.label}</h1>
              <p className="subhead">
                {activeCity.tagline}
              </p>
              <button
                type="button"
                className="panel-hide-toggle"
                aria-controls="panel-body"
                aria-expanded={!isPanelCollapsed}
                onClick={() => setIsPanelCollapsed((prev) => !prev)}
              >
                {isPanelCollapsed ? "Show" : "Hide"}
              </button>
            </div>

            <div className="panel-body" id="panel-body">
              <label className="field">
                <span>City</span>
                <select
                  value={city}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    roadSourceContentSeenRef.current = false;
                    setRoadsLoading(true);
                    setIsCatalogLoading(true);
                    setCity(event.target.value as CityKey);
                  }}
                >
                  {Object.entries(CITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.selectLabel ?? config.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="edit-roads-toggle"
                data-open={isEditingRoads ? "true" : "false"}
                onClick={() => setIsEditingRoads((prev) => !prev)}
              >
                {isEditingRoads ? "Close Road Editor" : "Edit Roads"}
              </button>
              {isEditingRoads && (
                <div className="road-editor">
                  <div className="road-editor-header">
                    <span>Selected Roads</span>
                    <span>{listedRoads.length} shown</span>
                  </div>
                  {city === "ottawa" && (
                    <div className="gatineau-toggle">
                      <span className="gatineau-toggle-label">
                        Include Gatineau roads
                      </span>
                      <button
                        type="button"
                        className="toggle-switch"
                        role="switch"
                        aria-checked={includeGatineauRoads}
                        aria-label="Include Gatineau roads"
                        data-checked={includeGatineauRoads ? "true" : "false"}
                        onClick={() =>
                          setIncludeGatineauRoads((prev) => !prev)
                        }
                      >
                        <span className="toggle-thumb" />
                        <span className="toggle-text toggle-text-yes">Yes</span>
                        <span className="toggle-text toggle-text-no">No</span>
                      </button>
                    </div>
                  )}
                  <ul className="road-list">
                    {listedRoads.length === 0 ? (
                      <li className="road-empty">
                        No roads selected yet. Add a road name or ref below.
                      </li>
                    ) : (
                      listedRoads.map((road) => (
                        <li key={road.token} className="road-item">
                          <span className="road-name">{road.label}</span>
                          <button
                            type="button"
                            className="road-remove"
                            onClick={() => handleRemoveRoad(road.token)}
                            aria-label={`Remove ${road.label}`}
                          >
                            X
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  <form className="road-input" onSubmit={handleAddRoad}>
                    <input
                      type="text"
                      placeholder="Add road name or ref"
                      value={roadInput}
                      onChange={(event) => setRoadInput(event.target.value)}
                    />
                    <button
                      type="submit"
                      className="road-add"
                      disabled={!roadInput.trim()}
                    >
                      Add
                    </button>
                  </form>
                  <p className="note">
                    Example inputs: "Bank", "Bank Street", or "Bank, Corkstown,
                    Queen".
                  </p>
                </div>
              )}
              <div className="quiz-toggle-stack">
                <button
                  type="button"
                  className="quiz-toggle"
                  data-active={isQuizActive ? "true" : "false"}
                  onClick={handleQuizToggle}
                >
                  {roadQuizButtonLabel}
                </button>
                {city === "kingston" && (
                  <button
                    type="button"
                    className="quiz-toggle buildings-quiz-toggle"
                    data-active={isBuildingQuizActive ? "true" : "false"}
                    onClick={handleBuildingQuizToggle}
                  >
                    Buildings Quiz
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
