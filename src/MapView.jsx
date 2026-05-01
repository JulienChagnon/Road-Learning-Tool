import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import maplibregl from "maplibre-gl";
const DEFAULT_CITY = "ottawa";
const BASE_TILE_SIZE = 256;
const getRasterScale = () => {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio > 1 ? 2 : 1;
};
const buildRasterStyle = (scale) => {
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
          `https://mt3.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}${scaleParam}`
        ],
        tileSize: BASE_TILE_SIZE * scale,
        attribution: "Satellite Imagery by \xA9 Google // Coded by Julien Chagnon"
      }
    },
    layers: [
      {
        id: "base",
        type: "raster",
        source: "googleSat",
        paint: { "raster-opacity": 1 }
      }
    ]
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
const POPULAR_ROADS_OTTAWA = [
  "Carling Avenue",
  "Hunt Club Road",
  "West Hunt Club Road",
  "Somerset Street West",
  "Bank Street",
  "Rideau Street",
  "Elgin Street",
  "Laurier Avenue",
  "Laurier Avenue West",
  "Wellington Street",
  "Bronson Avenue",
  "Baseline Road",
  "Merivale Road",
  "Woodroffe Avenue",
  "Greenbank Road",
  "Fisher Avenue",
  "Riverside Drive",
  "St. Laurent Boulevard",
  "Montreal Road",
  "Innes Road",
  "Blair Road",
  "Prince of Wales Drive",
  "Heron Road",
  "Main Street",
  "Lees Avenue",
  "King Edward Avenue",
  "Nicholas Street",
  "Scott Street",
  "Ogilvie Road",
  "Richmond Road",
  "Island Park Drive",
  "Parkdale Avenue",
  "Terry Fox Drive",
  "March Road",
  "Kichi Zibi Mikan",
  "Boulevard des Allumetti\xE8res",
  "Boulevard Maloney Ouest",
  "Boulevard Maisonneuve",
  "Alexandra Bridge",
  "Champlain Bridge",
  "Chaudi\xE8re Bridge",
  "Macdonald-Cartier Bridge",
  "Portage Bridge",
  "Hazeldean Road",
  "Eagleson Road",
  "Campeau Drive",
  "Kanata Avenue",
  "Robertson Road",
  "Moodie Drive",
  "Fallowfield Road",
  "Strandherd Drive",
  "Leitrim Road",
  "Tenth Line Road",
  "Walkley Road",
  "Promenade Vanier Parkway",
  "Industrial Avenue",
  "Colonel By Drive",
  "Queen Elizabeth Driveway",
  "Sussex Drive",
  "George Street",
  "York Street",
  "Clarence Street",
  "Dalhousie Street",
  "Slater Street",
  "Albert Street",
  "Metcalfe Street",
  "O'Connor Street",
  "Booth Street",
  "Wellington Street West",
  "Maitland Avenue",
  "Gladstone Avenue",
  "St. Joseph Boulevard",
  "Jeanne D'Arc Boulevard",
  "Aviation Parkway",
  "Sir-George-\xC9tienne-Cartier Parkway",
  "St. Patrick Street",
  "Murray Street",
  "Smyth Road",
  "Palladium Drive",
  "Castlefrank Road",
  "Rochester Street",
  "Kent Street",
  "Lyon Street",
  "Airport Parkway",
  "Queen Street"
];
const POPULAR_ROADS_MONTREAL = [
  "Route du Fleuve (Route 138)",
  // Ponts / tunnel structurants
  "Pont Champlain",
  "Pont Jacques-Cartier",
  "Tunnel Louis-Hippolyte-La Fontaine",
  "Pont Honor\xE9-Mercier",
  // Centre-ville / Ville-Marie
  "Rue Sainte-Catherine Ouest",
  "Rue Sainte-Catherine Est",
  "Boulevard Ren\xE9-L\xE9vesque Ouest",
  "Boulevard Ren\xE9-L\xE9vesque Est",
  "Rue Sherbrooke Ouest",
  "Rue Sherbrooke Est",
  "Boulevard De Maisonneuve Ouest",
  "Boulevard De Maisonneuve Est",
  "Rue Notre-Dame Ouest",
  "Rue Notre-Dame Est",
  "Boulevard Saint-Laurent",
  "Rue Saint-Denis",
  "Chemin de la C\xF4te-des-Neiges",
  "Boulevard Robert-Bourassa",
  // Grands axes N–S / E–O (île de Montréal)
  "Boulevard D\xE9carie",
  "Boulevard Pie-IX",
  "Boulevard Saint-Michel",
  "Boulevard Lacordaire",
  "Boulevard Langelier",
  // Grandes artères montréalaises
  "Boulevard Jean-Talon Ouest",
  "Boulevard Jean-Talon Est",
  "Boulevard Henri-Bourassa Ouest",
  "Boulevard Henri-Bourassa Est",
  "Boulevard Cr\xE9mazie",
  "Boulevard M\xE9tropolitain",
  // Laval
  "Boulevard Cur\xE9-Labelle",
  "Boulevard des Laurentides",
  "Boulevard Saint-Martin Ouest",
  "Boulevard Saint-Martin Est",
  // Longueuil / Rive-Sud
  "Boulevard Taschereau",
  "Boulevard Marie-Victorin",
  "Chemin de Chambly",
  "Boulevard Lapini\xE8re"
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
const POPULAR_ROAD_REFS_MONTREAL = [
  "Autoroute Bonaventure (A-10)",
  "Autoroute Chomedey (A-13)",
  "Autoroute D\xE9carie (A-15)",
  "Autoroute Jean-Lesage (A-20)",
  "Autoroute Louis-Hippolyte-La Fontaine (A-25)",
  "Autoroute de la Mont\xE9r\xE9gie (A-30)",
  "Autoroute F\xE9lix-Leclerc (A-40)",
  "Route de la Vall\xE9e-du-Richelieu (Route 116)",
  "Route Marie-Victorin (Route 132)"
];
const POPULAR_ROADS_BY_CITY = {
  ottawa: POPULAR_ROADS_OTTAWA,
  montreal: POPULAR_ROADS_MONTREAL,
  kingston: POPULAR_ROADS_KINGSTON
};
const POPULAR_ROAD_REFS_BY_CITY = {
  ottawa: POPULAR_ROAD_REFS_OTTAWA,
  montreal: POPULAR_ROAD_REFS_MONTREAL,
  kingston: []
};
const ALL_POPULAR_ROADS = [
  ...POPULAR_ROADS_BY_CITY.ottawa,
  ...POPULAR_ROADS_BY_CITY.montreal
];
const toDefaultToken = (value) => value.trim().toLowerCase();
const POPULAR_ROAD_NAME_SET = new Set(
  ALL_POPULAR_ROADS.map((name) => toDefaultToken(name))
);
const RESIDENTIAL_DEFAULT_POPULAR_ROADS = [
  "George Street",
  "York Street",
  "Clarence Street",
  "St. Patrick Street",
  "Albert Street",
  "Boulevard des Allumetti\xE8res",
  "Boulevard Alexandre-Tach\xE9",
  "Boulevard Maisonneuve"
];
const RESIDENTIAL_POPULAR_ROAD_NAME_SET = new Set(
  RESIDENTIAL_DEFAULT_POPULAR_ROADS.map((name) => toDefaultToken(name))
);
const MONTREAL_REF_LABEL_OVERRIDES = new Map(
  [
    ["10", "Autoroute Bonaventure (A-10)"],
    ["13", "Autoroute Chomedey (A-13)"],
    ["15", "Autoroute D\xE9carie (A-15)"],
    ["20", "Autoroute Jean-Lesage (A-20)"],
    ["25", "Autoroute Louis-Hippolyte-La Fontaine (A-25)"],
    ["30", "Autoroute de la Mont\xE9r\xE9gie (A-30)"],
    ["40", "Autoroute F\xE9lix-Leclerc (A-40)"],
    ["116", "Route de la Vall\xE9e-du-Richelieu (Route 116)"],
    ["132", "Route Marie-Victorin (Route 132)"],
    ["138", "Route du Fleuve (Route 138)"],
    ["117", "Route du Nord (Route 117)"]
  ].map(([ref, label]) => [toDefaultToken(ref), label])
);
const OTTAWA_REF_LABEL_OVERRIDES = new Map(
  [
    ["50", "50"],
    ["5", "Avenue de la Gatineau (A5)"]
  ].map(([ref, label]) => [toDefaultToken(ref), label])
);
const OTTAWA_REF_LABEL_EXCLUSIONS = /* @__PURE__ */ new Map([
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
    )
  ],
  [
    toDefaultToken("50"),
    new Set(
      ["Coventry Road", "Coventry Rd", "Ogilvie Road", "Ogilvie Rd"].map(
        (name) => toDefaultToken(name)
      )
    )
  ]
]);
const OTTAWA_ALIAS_TOKEN_BY_VALUE = new Map(
  [
    ["bd alexandre tache", "boulevard alexandre-tach\xE9"],
    ["bd alexandre-tache", "boulevard alexandre-tach\xE9"],
    ["bd alexandre tach\xE9", "boulevard alexandre-tach\xE9"],
    ["bd alexandre-tach\xE9", "boulevard alexandre-tach\xE9"],
    ["bd des allumetieres", "boulevard des allumetti\xE8res"],
    ["bd des allumettieres", "boulevard des allumetti\xE8res"],
    ["bd des allumetti\xE8res", "boulevard des allumetti\xE8res"],
    ["boulevard des allumetieres", "boulevard des allumetti\xE8res"]
  ].map(([alias, token]) => [toDefaultToken(alias), toDefaultToken(token)])
);
const OTTAWA_HIGHWAY_REF_TOKENS = new Set(
  ["50", "5"].map((ref) => toDefaultToken(ref))
);
const OTTAWA_NAME_LABEL_OVERRIDES = new Map(
  [
    ["Pont Alexandra", "Alexandra Bridge"],
    ["Pont Champlain Bridge", "Champlain Bridge"],
    ["Pont Macdonald-Cartier Bridge", "Macdonald-Cartier Bridge"],
    ["Pont du Portage", "Portage Bridge"],
    ["Pont du Portage Bridge", "Portage Bridge"],
    ["Pont de la Chaudi\xE8re", "Chaudi\xE8re Bridge"],
    ["Boulevard Maloney Ouest", "Boulevard Maloney O"]
  ].map(([name, label]) => [toDefaultToken(name), label])
);
const KINGSTON_NAME_LABEL_OVERRIDES = new Map(
  [
    ["King Street", "King Street"],
    ["King Street East", "King Street"],
    ["King Street West", "King Street"]
  ].map(([name, label]) => [toDefaultToken(name), label])
);
const buildDefaultRoadTokens = (names, refs) => [
  ...names.map((name) => toDefaultToken(name)),
  ...refs.map((ref) => toDefaultToken(ref))
];
const DEFAULT_ROAD_TOKENS_BY_CITY = {
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
  )
};
const OTTAWA_TILE_BOUNDS = [
  -76.046145,
  45.179021,
  -75.368409,
  45.57046
];
const MONTREAL_TILE_BOUNDS = [
  -73.953278,
  45.394652,
  -73.353682,
  45.697687
];
const KINGSTON_TILE_BOUNDS = [
  -76.528833,
  44.217435,
  -76.471204,
  44.25584
];
const KINGSTON_CENTER_OFFSET = [6e-3, -0.011];
const KINGSTON_CAMPUS_CENTER = [-76.495056, 44.22626];
const KINGSTON_CAMPUS_ZOOM = 15.5;
const KINGSTON_CAMPUS_MOBILE_ZOOM = 14.8;
const buildMapBounds = (bounds, padX = 0.8, padY = 0.4) => [
  bounds[0] - padX,
  bounds[1] - padY,
  bounds[2] + padX,
  bounds[3] + padY
];
const buildBoundsCenter = (bounds) => [
  (bounds[0] + bounds[2]) / 2,
  (bounds[1] + bounds[3]) / 2
];
const getQuizResultDuration = () => {
  if (typeof window === "undefined") return 500;
  return window.matchMedia("(max-width: 900px)").matches ? 700 : 500;
};
const getKingstonCampusZoom = () => {
  if (typeof window === "undefined") return KINGSTON_CAMPUS_ZOOM;
  return window.matchMedia("(max-width: 900px)").matches ? KINGSTON_CAMPUS_MOBILE_ZOOM : KINGSTON_CAMPUS_ZOOM;
};
const CITY_CONFIG = {
  ottawa: {
    label: "Ottawa/Gatineau",
    selectLabel: "Ottawa",
    center: buildBoundsCenter(OTTAWA_TILE_BOUNDS),
    zoom: 11.5,
    tileBounds: OTTAWA_TILE_BOUNDS,
    mapBounds: buildMapBounds(OTTAWA_TILE_BOUNDS),
    tilePath: "assets/tiles/ottawa/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/ottawa.json",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.ottawa
  },
  montreal: {
    label: "Montreal",
    center: buildBoundsCenter(MONTREAL_TILE_BOUNDS),
    zoom: 11.5,
    tileBounds: MONTREAL_TILE_BOUNDS,
    mapBounds: buildMapBounds(MONTREAL_TILE_BOUNDS),
    tilePath: "assets/tiles/montreal/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/montreal.json",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.montreal
  },
  kingston: {
    label: "Queen's University",
    selectLabel: "Kingston (Queen's University)",
    center: [
      buildBoundsCenter(KINGSTON_TILE_BOUNDS)[0] + KINGSTON_CENTER_OFFSET[0],
      buildBoundsCenter(KINGSTON_TILE_BOUNDS)[1] + KINGSTON_CENTER_OFFSET[1]
    ],
    zoom: 13.4,
    tileBounds: KINGSTON_TILE_BOUNDS,
    mapBounds: buildMapBounds(KINGSTON_TILE_BOUNDS),
    tilePath: "assets/tiles/kingston/{z}/{x}/{y}.pbf",
    buildingTilePath: "assets/tiles/kingston/buildings/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/kingston.json",
    defaultTokens: DEFAULT_ROAD_TOKENS_BY_CITY.kingston
  }
};
const resolveStaticUrl = (path) => {
  if (typeof window === "undefined") return path;
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const baseHref = base.href.endsWith("/") ? base.href : `${base.href}/`;
  return `${baseHref}${path.replace(/^\/+/, "")}`;
};
const getRoadTileUrl = (city) => resolveStaticUrl(CITY_CONFIG[city].tilePath);
const getRoadCatalogUrl = (city) => resolveStaticUrl(CITY_CONFIG[city].catalogPath);
const getBuildingTileUrl = (city) => {
  const path = CITY_CONFIG[city].buildingTilePath;
  return path ? resolveStaticUrl(path) : null;
};
const QUIZ_PATH_SEGMENT = "quiz";
const BUILDINGS_PATH_SEGMENT = "buildings";
const ROUTE_HASH_PREFIX = "#/";
const CITY_PATH_SEGMENTS = {
  ottawa: "ottawa",
  montreal: "montreal",
  kingston: "queens"
};
const CITY_PATH_ALIASES = {
  ottawa: ["", "ottawa"],
  montreal: ["montreal"],
  kingston: ["queens", "kingston_queens_university", "kingston"]
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
const normalizePathname = (path) => path.endsWith("/") ? path : `${path}/`;
const getPathSegments = (pathname) => {
  const basePath = normalizePathname(getBasePathname()).toLowerCase();
  let normalized = normalizePathname(pathname).toLowerCase();
  if (normalized.startsWith(basePath)) {
    normalized = normalized.slice(basePath.length);
  }
  const trimmed = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? trimmed.split("/") : [];
};
const getCityFromPathname = (pathname) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return DEFAULT_CITY;
  if (segments[0] === QUIZ_PATH_SEGMENT) return DEFAULT_CITY;
  for (const [city, aliases] of Object.entries(CITY_PATH_ALIASES)) {
    if (aliases.includes(segments[0])) {
      return city;
    }
  }
  return DEFAULT_CITY;
};
const getQuizFromPathname = (pathname) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(QUIZ_PATH_SEGMENT);
};
const getBuildingQuizFromPathname = (pathname) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(BUILDINGS_PATH_SEGMENT);
};
const stringToColor = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 55%)`;
};
const stringToPastelColor = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 80%)`;
};
const buildBuildingLabelCanonicalExpression = (labelExpression, overrides) => {
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
const buildBuildingColorExpression = (labelExpression, labels, fallbackColor, colorOverrides = {}) => {
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
const buildBuildingQuizColorExpression = (labelExpression, correctLabels, incorrectLabels, baseColor) => {
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
const buildContrastingTextColorExpression = (colorExpr, threshold = 0.55) => {
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
const DEFAULT_ROAD_COLOR = "#f28c5f";
const QUIZ_BASE_ROAD_COLOR = "#ffffff85";
const QUIZ_CORRECT_ROAD_COLOR = "#4fb360ff";
const QUIZ_INCORRECT_ROAD_COLOR = "#dd5656ff";
const BUILDING_QUIZ_ROAD_COLOR = "#b6bbc2";
const ROAD_LABEL_SIZE_EXPRESSION = [
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
const BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION = [
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
const ROAD_COLOR_OVERRIDES = {
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
const ROAD_NAME_GETTER = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name"],
  ["get", "name_en"],
  ""
];
const ROAD_NAME_EXPRESSION = ["downcase", ROAD_NAME_GETTER];
const ROAD_PRIMARY_NAME_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "name"], ""]
];
const ROAD_ALT_NAME_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "name:en"], ["get", "name_en"], ""]
];
const ROAD_NAME_EXPRESSIONS = [
  ROAD_PRIMARY_NAME_EXPRESSION,
  // "name"
  ROAD_ALT_NAME_EXPRESSION
  // "name:en" / "name_en"
];
const buildAnyNameInExpression = (names) => [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", names]]
  )
];
const buildRefMatchExpression = (refs) => {
  if (!refs.length) return null;
  const refFilters = [];
  const plainRefs = [];
  for (const ref of refs) {
    const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    if (!exclusions?.size) {
      plainRefs.push(ref);
      continue;
    }
    refFilters.push([
      "all",
      ["in", ROAD_REF_EXPRESSION, ["literal", [ref]]],
      ["!", buildAnyNameInExpression(Array.from(exclusions))]
    ]);
  }
  if (plainRefs.length) {
    refFilters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", plainRefs]
    ]);
  }
  if (!refFilters.length) return null;
  return refFilters.length === 1 ? refFilters[0] : ["any", ...refFilters];
};
const ROAD_REF_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "ref"], ""]
];
const MAIN_STREET_TOKEN = "main street";
const BOOTH_STREET_TOKEN = toDefaultToken("Booth Street");
const CHAUDIERE_BRIDGE_LABEL = "Chaudi\xE8re Bridge";
const RUE_CLARENCE_TOKEN = toDefaultToken("Rue Clarence");
const MAIN_STREET_DOWNTOWN_BOUNDS = [
  -75.72,
  45.39,
  -75.64,
  45.44
];
const boundsToPolygon = (bounds) => ({
  type: "Polygon",
  coordinates: [
    [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[1]],
      [bounds[2], bounds[3]],
      [bounds[0], bounds[3]],
      [bounds[0], bounds[1]]
    ]
  ]
});
const MAIN_STREET_DOWNTOWN_POLYGON = boundsToPolygon(
  MAIN_STREET_DOWNTOWN_BOUNDS
);
const CHAUDIERE_BRIDGE_BOUNDS = [
  -75.7202,
  45.4199,
  -75.7177,
  45.4226
];
const CHAUDIERE_BRIDGE_POLYGON = boundsToPolygon(CHAUDIERE_BRIDGE_BOUNDS);
const MAIN_STREET_DOWNTOWN_FILTER = [
  "any",
  ["!=", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
  [
    "all",
    ["==", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
    ["within", MAIN_STREET_DOWNTOWN_POLYGON]
  ]
];
const CHAUDIERE_BRIDGE_OVERRIDE_MATCH = [
  "all",
  ["within", CHAUDIERE_BRIDGE_POLYGON],
  ["==", ROAD_NAME_EXPRESSION, BOOTH_STREET_TOKEN]
];
const CHAUDIERE_BRIDGE_OVERRIDE_FILTER = CHAUDIERE_BRIDGE_OVERRIDE_MATCH;
const RUE_CLARENCE_EXCLUDE_FILTER = [
  "all",
  ["!=", ROAD_PRIMARY_NAME_EXPRESSION, RUE_CLARENCE_TOKEN],
  ["!=", ROAD_ALT_NAME_EXPRESSION, RUE_CLARENCE_TOKEN]
];
const GATINEAU_ROAD_NAME_TOKENS = [
  "Boulevard Alexandre-Tach\xE9",
  "Boulevard Alexandre-Tache",
  "Boulevard Alexandre Tache",
  "Boulevard des Allumetti\xE8res",
  "Boulevard des Allumetieres",
  "Boulevard Maloney Ouest",
  "Boulevard Maloney O",
  "Boulevard Maisonneuve",
  "Boulevard de Maisonneuve",
  "Maisonneuve Street"
].map((name) => toDefaultToken(name));
const GATINEAU_ROAD_REF_TOKENS = ["5", "50"].map(
  (ref) => toDefaultToken(ref)
);
const GATINEAU_ROAD_TOKEN_SET = /* @__PURE__ */ new Set([
  ...GATINEAU_ROAD_NAME_TOKENS,
  ...GATINEAU_ROAD_REF_TOKENS
]);
const GATINEAU_EXEMPT_NAME_TOKENS = [
  "Macdonald-Cartier Bridge",
  "Pont Macdonald-Cartier Bridge",
  "Coventry Road",
  "Coventry Rd",
  "Ogilvie Road",
  "Ogilvie Rd"
].map((name) => toDefaultToken(name));
const GATINEAU_EXEMPT_NAME_FILTER = [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_EXEMPT_NAME_TOKENS]]
  )
];
const GATINEAU_ROAD_NAME_FILTER = [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_ROAD_NAME_TOKENS]]
  )
];
const GATINEAU_ROAD_REF_VALUE_EXPRESSION = [
  "concat",
  ";",
  ROAD_REF_EXPRESSION,
  ";"
];
const GATINEAU_ROAD_REF_FILTER = [
  "all",
  [
    "any",
    ...GATINEAU_ROAD_REF_TOKENS.map(
      (ref) => ["in", `;${ref};`, GATINEAU_ROAD_REF_VALUE_EXPRESSION]
    )
  ],
  ["!", GATINEAU_EXEMPT_NAME_FILTER]
];
const GATINEAU_ROADS_EXCLUDE_FILTER = [
  "!",
  [
    "any",
    GATINEAU_ROAD_NAME_FILTER,
    GATINEAU_ROAD_REF_FILTER
  ]
];
const ROAD_LABEL_TEXT_EXPRESSION = [
  "coalesce",
  ["get", "name"],
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "ref"],
  ""
];
const ROAD_LABEL_TEXT_EXPRESSION_EN_FIRST = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name"],
  ["get", "ref"],
  ""
];
const buildOttawaLabelTextExpression = (useChaudiereOverride) => {
  let baseExpression = ROAD_LABEL_TEXT_EXPRESSION_EN_FIRST;
  if (OTTAWA_NAME_LABEL_OVERRIDES.size) {
    const cases2 = [];
    for (const [name, label] of OTTAWA_NAME_LABEL_OVERRIDES) {
      cases2.push(["==", ROAD_NAME_EXPRESSION, name], label);
    }
    baseExpression = ["case", ...cases2, baseExpression];
  }
  if (!useChaudiereOverride) {
    if (!OTTAWA_REF_LABEL_OVERRIDES.size) {
      return baseExpression;
    }
    const refValue2 = [
      "concat",
      ";",
      ["downcase", ["coalesce", ["get", "ref"], ""]],
      ";"
    ];
    const cases2 = [];
    for (const [ref, label] of OTTAWA_REF_LABEL_OVERRIDES) {
      const excludedNames = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
      const baseMatch = [
        "in",
        `;${ref};`,
        refValue2
      ];
      const match = excludedNames?.size ? [
        "all",
        baseMatch,
        ["!", buildAnyNameInExpression(Array.from(excludedNames))]
      ] : baseMatch;
      cases2.push(match, label);
    }
    return ["case", ...cases2, baseExpression];
  }
  let labeledExpression = [
    "case",
    CHAUDIERE_BRIDGE_OVERRIDE_MATCH,
    CHAUDIERE_BRIDGE_LABEL,
    baseExpression
  ];
  if (!OTTAWA_REF_LABEL_OVERRIDES.size) {
    return labeledExpression;
  }
  const refValue = [
    "concat",
    ";",
    ["downcase", ["coalesce", ["get", "ref"], ""]],
    ";"
  ];
  const cases = [];
  for (const [ref, label] of OTTAWA_REF_LABEL_OVERRIDES) {
    const excludedNames = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    const baseMatch = ["in", `;${ref};`, refValue];
    const match = excludedNames?.size ? [
      "all",
      baseMatch,
      ["!", buildAnyNameInExpression(Array.from(excludedNames))]
    ] : baseMatch;
    cases.push(match, label);
  }
  labeledExpression = ["case", ...cases, labeledExpression];
  return labeledExpression;
};
const buildMontrealLabelTextExpression = () => {
  if (!MONTREAL_REF_LABEL_OVERRIDES.size) {
    return ROAD_LABEL_TEXT_EXPRESSION;
  }
  const refValue = [
    "concat",
    ";",
    ["downcase", ["coalesce", ["get", "ref"], ""]],
    ";"
  ];
  const cases = [];
  for (const [ref, label] of MONTREAL_REF_LABEL_OVERRIDES) {
    cases.push(["in", `;${ref};`, refValue], label);
  }
  return ["case", ...cases, ROAD_LABEL_TEXT_EXPRESSION];
};
const buildRoadLabelTextExpression = (city, options) => {
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
const ALWAYS_FALSE_EXPRESSION = ["literal", false];
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
  "tertiary_link"
];
const MAJOR_HIGHWAY_FILTER = [
  "in",
  ["get", "highway"],
  ["literal", MAJOR_HIGHWAY_TYPES]
];
const DIRECTIONAL_SUFFIX_PARTS = /* @__PURE__ */ new Set([
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
  "ouest"
]);
const normalizeRoadToken = (value) => value.trim().toLowerCase();
const foldRoadToken = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const foldTokenForMatch = (value) => foldRoadToken(value.trim().toLowerCase());
const CHAUDIERE_BRIDGE_TOKEN_FOLDED = foldTokenForMatch(CHAUDIERE_BRIDGE_LABEL);
const findTokenByFoldedMatch = (tokens, foldedToken) => tokens.find((token) => foldTokenForMatch(token) === foldedToken);
const findChaudiereBridgeToken = (tokens) => findTokenByFoldedMatch(tokens, CHAUDIERE_BRIDGE_TOKEN_FOLDED);
const hasChaudiereBridgeToken = (tokens) => Boolean(findChaudiereBridgeToken(tokens));
const getTokenParts = (token) => {
  const parts = token.split(TOKEN_PARTS_SPLIT_REGEX).filter(Boolean);
  if (!parts.length) return [];
  const filtered = parts.filter(
    (part) => part.length >= 2 || NUMERIC_PART_REGEX.test(part)
  );
  return filtered.length ? filtered : parts;
};
const getFoldedTokenParts = (token) => getTokenParts(foldRoadToken(token));
const buildTokenMatchExpression = (token, fieldExpression, minSubstringLength) => {
  const parts = getTokenParts(token);
  if (!parts.length) return ALWAYS_FALSE_EXPRESSION;
  if (parts.length > 1) {
    const partExpressions = parts.map(
      (part2) => ["in", part2, fieldExpression]
    );
    return ["all", ...partExpressions];
  }
  const [part] = parts;
  if (part.length < minSubstringLength) {
    return ["==", fieldExpression, part];
  }
  return ["in", part, fieldExpression];
};
const isHighwayToken = (token, label) => NUMERIC_PART_REGEX.test(token) || NUMERIC_PART_REGEX.test(label);
const getNameParts = (value) => getFoldedTokenParts(value);
const wordMatchesTokenPart = (tokenPart, namePart) => {
  if (!tokenPart || !namePart) return false;
  if (NUMERIC_PART_REGEX.test(tokenPart)) return namePart === tokenPart;
  if (tokenPart.length < MIN_NAME_SUBSTRING_LENGTH) {
    return namePart === tokenPart;
  }
  if (namePart === tokenPart) return true;
  return namePart.endsWith("s") && namePart.slice(0, -1) === tokenPart;
};
const hasOnlyDirectionalSuffixParts = (tokenParts, nameParts) => {
  if (nameParts.length < tokenParts.length) return false;
  if (nameParts.length === tokenParts.length) return true;
  for (let index = tokenParts.length; index < nameParts.length; index += 1) {
    if (!DIRECTIONAL_SUFFIX_PARTS.has(nameParts[index])) return false;
  }
  return true;
};
const matchesNameTokenParts = (tokenParts, nameParts) => {
  if (!tokenParts.length || !nameParts.length) return false;
  if (tokenParts.length === 1) {
    return nameParts.some(
      (namePart) => wordMatchesTokenPart(tokenParts[0], namePart)
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
const matchesRefTokenParts = (tokenParts, refParts) => {
  if (!tokenParts.length || !refParts.length) return false;
  if (tokenParts.length === 1) {
    return refParts.includes(tokenParts[0]);
  }
  return tokenParts.every((tokenPart) => refParts.includes(tokenPart));
};
const splitNamesByPopularity = (names) => {
  const majorPopular = [];
  const residentialPopular = [];
  const other = [];
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
const isPreferredPopularCandidate = (candidate, current, tokenParts) => {
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
const selectPreferredPopularMatch = (token, tokenParts, roadIndex) => {
  const exactLabel = roadIndex.nameLabelByNormalized.get(token);
  if (exactLabel) {
    return { normalized: token, label: exactLabel };
  }
  let best = null;
  for (const entry of roadIndex.nameEntries) {
    if (!matchesNameTokenParts(tokenParts, entry.parts)) continue;
    if (!best || isPreferredPopularCandidate(entry, best, tokenParts)) {
      best = entry;
    }
  }
  if (!best) return null;
  return { normalized: best.normalized, label: best.label };
};
const buildStrictNameFilter = (names, highwayFilter) => {
  if (!names.length) return null;
  const strictFilter = [
    "any",
    ...ROAD_NAME_EXPRESSIONS.map(
      (expr) => ["in", expr, ["literal", names]]
    )
  ];
  if (!highwayFilter) return strictFilter;
  return ["all", highwayFilter, strictFilter];
};
const buildRefMatchFilter = (refs, includeHighwayFilter) => {
  if (!refs.length) return null;
  const refFilters = [];
  const refsWithoutExclusions = [];
  for (const ref of refs) {
    const exclusions = OTTAWA_REF_LABEL_EXCLUSIONS.get(ref);
    if (!exclusions?.size) {
      refsWithoutExclusions.push(ref);
      continue;
    }
    refFilters.push([
      "all",
      ["in", ROAD_REF_EXPRESSION, ["literal", [ref]]],
      ["!", buildAnyNameInExpression(Array.from(exclusions))]
    ]);
  }
  if (refsWithoutExclusions.length) {
    refFilters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", refsWithoutExclusions]
    ]);
  }
  if (!refFilters.length) return null;
  const baseFilter = refFilters.length === 1 ? refFilters[0] : ["any", ...refFilters];
  return includeHighwayFilter ? ["all", MAJOR_HIGHWAY_FILTER, baseFilter] : baseFilter;
};
const buildRoadIndex = (catalog) => {
  const buildEntries = (values) => {
    const entries = [];
    const labelByNormalized = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new Set();
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
        parts: getNameParts(normalized)
      });
    }
    return { entries, labelByNormalized };
  };
  const buildAliases = (aliases) => {
    const aliasByToken = /* @__PURE__ */ new Map();
    const aliasTokenByValue = /* @__PURE__ */ new Map();
    if (!aliases?.length) {
      return { aliasByToken, aliasTokenByValue };
    }
    for (const alias of aliases) {
      const token = normalizeRoadToken(alias.token ?? "");
      if (!token) continue;
      const names = (alias.names ?? []).map((name) => normalizeRoadToken(name)).filter(Boolean);
      const refs = (alias.refs ?? []).map((ref) => normalizeRoadToken(ref)).filter(Boolean);
      if (!names.length && !refs.length) continue;
      const label = alias.label?.trim() || void 0;
      const existing = aliasByToken.get(token);
      const mergedNames = /* @__PURE__ */ new Set([...existing?.names ?? [], ...names]);
      const mergedRefs = /* @__PURE__ */ new Set([...existing?.refs ?? [], ...refs]);
      const merged = {
        label: existing?.label ?? label,
        names: Array.from(mergedNames),
        refs: Array.from(mergedRefs)
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
    aliasTokenByValue: aliasIndex.aliasTokenByValue
  };
};
const tokenMatchCache = /* @__PURE__ */ new WeakMap();
const getTokenMatch = (roadIndex, token) => {
  let cache = tokenMatchCache.get(roadIndex);
  if (!cache) {
    cache = /* @__PURE__ */ new Map();
    tokenMatchCache.set(roadIndex, cache);
  }
  const cached = cache.get(token);
  if (cached) return cached;
  const tokenParts = getFoldedTokenParts(token);
  const matchedNames = /* @__PURE__ */ new Set([token]);
  const strictMatchedNames = /* @__PURE__ */ new Set();
  const matchedRefs = /* @__PURE__ */ new Set([token]);
  const nameMatches = /* @__PURE__ */ new Set([token]);
  const refMatches = /* @__PURE__ */ new Set([token]);
  const alias = roadIndex.aliasByToken.get(token);
  const nameLabel = roadIndex.nameLabelByNormalized.get(token);
  const refLabel = roadIndex.refLabelByNormalized.get(token);
  let tokenLabel = null;
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
  let preferredMatch = null;
  if (POPULAR_ROAD_NAME_SET.has(token)) {
    preferredMatch = nameLabel ? { normalized: token, label: nameLabel } : selectPreferredPopularMatch(token, tokenParts, roadIndex);
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
  const result = {
    matchedNames,
    strictMatchedNames,
    matchedRefs,
    nameMatches,
    refMatches,
    tokenLabel
  };
  cache.set(token, result);
  return result;
};
const buildRoadMatchIndex = (roadIndex, roadTokens, labelOverrides) => {
  const matchedNames = /* @__PURE__ */ new Set();
  const matchedRefs = /* @__PURE__ */ new Set();
  const strictMatchedNames = /* @__PURE__ */ new Set();
  const nameMatchesByToken = /* @__PURE__ */ new Map();
  const refMatchesByToken = /* @__PURE__ */ new Map();
  const tokenLabels = /* @__PURE__ */ new Map();
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
  const mapToSortedArrays = (map) => new Map(
    Array.from(map.entries()).map(([token, set]) => [
      token,
      Array.from(set).sort((a, b) => a.localeCompare(b))
    ])
  );
  return {
    matchedNames: Array.from(matchedNames).sort(
      (a, b) => a.localeCompare(b)
    ),
    strictMatchedNames: Array.from(strictMatchedNames).sort(
      (a, b) => a.localeCompare(b)
    ),
    matchedRefs: Array.from(matchedRefs).sort((a, b) => a.localeCompare(b)),
    nameMatchesByToken: mapToSortedArrays(nameMatchesByToken),
    refMatchesByToken: mapToSortedArrays(refMatchesByToken),
    tokenLabels
  };
};
const getRoadFilterOverrides = (city, roadTokens) => {
  if (city !== "ottawa") return [];
  if (!hasChaudiereBridgeToken(roadTokens)) return [];
  return [CHAUDIERE_BRIDGE_OVERRIDE_FILTER];
};
const getHighwayRefTokens = (city) => city === "ottawa" ? OTTAWA_HIGHWAY_REF_TOKENS : null;
const getRoadGlobalFilters = (city, includeGatineauRoads) => {
  if (city !== "ottawa") return [];
  const filters = [RUE_CLARENCE_EXCLUDE_FILTER];
  if (!includeGatineauRoads) {
    filters.push(GATINEAU_ROADS_EXCLUDE_FILTER);
  }
  return filters;
};
const shouldUseChaudiereBridgeOverride = (city, roadTokens) => city === "ottawa" && hasChaudiereBridgeToken(roadTokens);
const buildRoadFilter = (roadTokens, matchIndex, extraFilters = [], globalFilters = [], options) => {
  if (!roadTokens.length) {
    return ALWAYS_FALSE_EXPRESSION;
  }
  const highwayRefTokens = options?.highwayRefTokens ?? null;
  if (!matchIndex) {
    const majorStrictNameTokens = roadTokens.filter(
      (token) => POPULAR_ROAD_NAME_SET.has(token) && !RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );
    const residentialStrictNameTokens = roadTokens.filter(
      (token) => RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );
    const looseTokens = roadTokens.filter(
      (token) => !POPULAR_ROAD_NAME_SET.has(token) && !RESIDENTIAL_POPULAR_ROAD_NAME_SET.has(token)
    );
    const highwayOnlyLooseTokens = highwayRefTokens ? looseTokens.filter((token) => highwayRefTokens.has(token)) : [];
    const standardLooseTokens = highwayRefTokens ? looseTokens.filter((token) => !highwayRefTokens.has(token)) : looseTokens;
    const filters2 = [];
    const majorStrictNameFilter = buildStrictNameFilter(
      majorStrictNameTokens,
      MAJOR_HIGHWAY_FILTER
    );
    if (majorStrictNameFilter) {
      filters2.push(majorStrictNameFilter);
    }
    const residentialStrictNameFilter = buildStrictNameFilter(
      residentialStrictNameTokens
    );
    if (residentialStrictNameFilter) {
      filters2.push(residentialStrictNameFilter);
    }
    if (standardLooseTokens.length) {
      filters2.push([
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
          )
        ])
      ]);
    }
    if (highwayOnlyLooseTokens.length) {
      filters2.push(
        ...highwayOnlyLooseTokens.map(
          (token) => [
            "all",
            MAJOR_HIGHWAY_FILTER,
            buildTokenMatchExpression(
              token,
              ROAD_REF_EXPRESSION,
              MIN_REF_SUBSTRING_LENGTH
            )
          ]
        )
      );
    }
    if (extraFilters.length) {
      filters2.push(...extraFilters);
    }
    if (!filters2.length) return ALWAYS_FALSE_EXPRESSION;
    return [
      "all",
      MAIN_STREET_DOWNTOWN_FILTER,
      ...globalFilters,
      ["any", ...filters2]
    ];
  }
  const filters = [];
  const highwayNameMatches = highwayRefTokens ? (() => {
    const names = /* @__PURE__ */ new Set();
    for (const token of highwayRefTokens) {
      const matches = matchIndex.nameMatchesByToken.get(token);
      matches?.forEach((name) => names.add(name));
    }
    return names;
  })() : null;
  const strictMatchedNames = highwayNameMatches ? matchIndex.strictMatchedNames.filter(
    (name) => !highwayNameMatches.has(name)
  ) : matchIndex.strictMatchedNames;
  const matchedNames = highwayNameMatches ? matchIndex.matchedNames.filter((name) => !highwayNameMatches.has(name)) : matchIndex.matchedNames;
  const {
    majorPopular: majorPopularStrictNames,
    residentialPopular: residentialPopularStrictNames,
    other: otherStrictNames
  } = splitNamesByPopularity(strictMatchedNames);
  const {
    majorPopular: majorPopularMatchedNames,
    residentialPopular: residentialPopularMatchedNames,
    other: otherMatchedNames
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
      buildAnyNameInExpression(majorPopularMatchedNames)
    ]);
  }
  if (residentialPopularMatchedNames.length) {
    filters.push(buildAnyNameInExpression(residentialPopularMatchedNames));
  }
  if (otherMatchedNames.length) {
    filters.push(
      buildAnyNameInExpression(otherMatchedNames)
    );
  }
  const highwayMatchedRefs = highwayRefTokens ? (() => {
    const refs = /* @__PURE__ */ new Set();
    for (const token of highwayRefTokens) {
      const matches = matchIndex.refMatchesByToken.get(token);
      matches?.forEach((ref) => refs.add(ref));
    }
    return Array.from(refs);
  })() : [];
  const standardMatchedRefs = highwayMatchedRefs.length ? matchIndex.matchedRefs.filter((ref) => !highwayMatchedRefs.includes(ref)) : matchIndex.matchedRefs;
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
    ["any", ...filters]
  ];
};
const buildRoadColorExpression = (roadTokens, matchIndex, fallbackColor = DEFAULT_ROAD_COLOR, colorOverrides) => {
  if (!roadTokens.length) return fallbackColor;
  const getTokenColor = (token) => colorOverrides?.[token] ?? ROAD_COLOR_OVERRIDES[token] ?? stringToColor(token);
  const chaudiereToken = findChaudiereBridgeToken(roadTokens);
  const overridePairs = [];
  if (chaudiereToken) {
    overridePairs.push(
      CHAUDIERE_BRIDGE_OVERRIDE_MATCH,
      getTokenColor(chaudiereToken)
    );
  }
  if (!matchIndex) {
    const colorPairs2 = roadTokens.flatMap((token) => {
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
        tokenColor
      ];
    });
    return [
      "case",
      ...overridePairs,
      ...colorPairs2,
      fallbackColor
    ];
  }
  const colorPairs = roadTokens.flatMap((token) => {
    const tokenColor = getTokenColor(token);
    const nameMatches = matchIndex.nameMatchesByToken.get(token);
    const refMatches = matchIndex.refMatchesByToken.get(token);
    const pairs = [];
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
    fallbackColor
  ];
};
const buildRoadOpacityExpression = (roadTokens, matchIndex, fallbackOpacity = 1) => {
  if (!roadTokens.length) return fallbackOpacity;
  const overridePairs = [];
  if (findChaudiereBridgeToken(roadTokens)) {
    overridePairs.push(CHAUDIERE_BRIDGE_OVERRIDE_MATCH, 1);
  }
  if (!matchIndex) {
    const opacityPairs2 = roadTokens.flatMap((token) => [
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
      1
    ]);
    return [
      "case",
      ...overridePairs,
      ...opacityPairs2,
      fallbackOpacity
    ];
  }
  const opacityPairs = roadTokens.flatMap((token) => {
    const nameMatches = matchIndex.nameMatchesByToken.get(token);
    const refMatches = matchIndex.refMatchesByToken.get(token);
    const pairs = [];
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
    fallbackOpacity
  ];
};
const shuffleTokens = (tokens) => {
  const shuffled = [...tokens];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index]
    ];
  }
  return shuffled;
};
const getQuizEmptyMessage = (correctCount, guessCount) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No selected roads visible. Pan or zoom for another prompt.";
};
const getBuildingQuizEmptyMessage = (correctCount, guessCount) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No campus buildings visible. Zoom in for another prompt.";
};
const NAME_SEPARATOR_REGEX = /\s*(?:\/|&|\+)\s*/i;
const getFeatureNameCandidates = (value) => {
  const normalized = normalizeRoadToken(value);
  if (!normalized) return [];
  const candidates = /* @__PURE__ */ new Set([normalized]);
  const splitNames = normalized.split(NAME_SEPARATOR_REGEX).map((entry) => entry.trim()).filter(Boolean);
  splitNames.forEach((entry) => candidates.add(entry));
  return Array.from(candidates);
};
const featureMatchesToken = (feature, tokenParts, token) => {
  const properties = feature.properties ?? {};
  const nameValues = [
    properties["name"],
    properties["name:en"],
    properties["name_en"]
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
    if (normalizedRef && matchesRefTokenParts(tokenParts, getTokenParts(normalizedRef))) {
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
const canonicalizeBuildingLabel = (label) => KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP.get(label) ?? label;
const normalizeBuildingLabel = (label) => canonicalizeBuildingLabel(label.trim()).toLowerCase();
const getBuildingDisplayLabel = (label) => {
  const canonicalLabel = canonicalizeBuildingLabel(label.trim());
  return KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP.get(canonicalLabel) ?? canonicalLabel;
};
const buildingFeatureMatchesLabel = (feature, label) => {
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
const getBuildingLabelCandidate = (feature) => {
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
const getRingAreaAndCentroid = (ring) => {
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
const getPolygonAreaAndCentroid = (rings) => {
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
const getGeometryAreaAndCentroid = (geometry) => {
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
const getQuizFeatureTokens = (features, matchIndex) => {
  const matchedTokens = /* @__PURE__ */ new Set();
  if (!matchIndex) return matchedTokens;
  for (const feature of features) {
    const properties = feature.properties ?? {};
    const nameValues = [
      properties["name"],
      properties["name:en"],
      properties["name_en"]
    ];
    const nameCandidates = /* @__PURE__ */ new Set();
    for (const value of nameValues) {
      if (typeof value !== "string") continue;
      getFeatureNameCandidates(value).forEach(
        (candidate) => nameCandidates.add(candidate)
      );
    }
    const refValue = properties["ref"];
    const refParts = typeof refValue === "string" ? getTokenParts(normalizeRoadToken(refValue)) : [];
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
const BUILDING_LABEL_TEXT_EXPRESSION = [
  "coalesce",
  ["get", "name"],
  ["get", "official_name"],
  ["get", "alt_name"],
  ["get", "operator"]
];
const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES = [
  ["Bruce Wing", "Miller Hall"],
  ["Jean Royce Hall - Phase 1", "Jean Royce Hall"],
  ["Jean Royce Hall - Phase 2", "Jean Royce Hall"]
];
const KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
);
const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES = [
  ["Beamish-Munro Hall", "Beamish-Munro Hall (ILC)"],
  ["Duncan McArthur Hall", "Duncan McArthur Hall (Faculty of Education)"],
  ["Queen's Athletics Recreation Centre", "Queen's Athletics Recreation Centre (ARC)"]
];
const KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDE_MAP = new Map(
  KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
);
const BUILDING_LABEL_CANONICAL_EXPRESSION = buildBuildingLabelCanonicalExpression(
  BUILDING_LABEL_TEXT_EXPRESSION,
  KINGSTON_BUILDING_LABEL_CANONICAL_OVERRIDES
);
const BUILDING_LABEL_DISPLAY_EXPRESSION = buildBuildingLabelCanonicalExpression(
  BUILDING_LABEL_CANONICAL_EXPRESSION,
  KINGSTON_BUILDING_LABEL_DISPLAY_OVERRIDES
);
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
const KINGSTON_BUILDING_DISPLAY_LABELS = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => getBuildingDisplayLabel(label)
);
const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER = KINGSTON_BUILDING_VISIBLE_LABELS.map(
  (label) => normalizeBuildingLabel(label)
);
const KINGSTON_BUILDING_VISIBLE_LABELS_LOWER_SET = new Set(
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER
);
const DEFAULT_BUILDING_LABEL_OFFSET = [0, 0];
const EMPTY_BUILDING_LABEL_GEOJSON = {
  type: "FeatureCollection",
  features: []
};
const buildBuildingLabelFeatureCollection = (features, allowedLabels = null) => {
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
const KINGSTON_BUILDING_FALLBACK_COLOR = "#d8e4ef";
const KINGSTON_BUILDING_QUIZ_BASE_COLOR = "#b8c0c7";
const KINGSTON_BUILDING_ROAD_QUIZ_COLOR = "#f2f2f2";
const KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR = "#ffffff";
const KINGSTON_BUILDING_COLOR_OVERRIDES = {
  "Leonard Hall": "#a2f0e9",
  "Walter Light Hall": "#c18772",
  "Stauffer Library": "#827cc4"
};
const KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION = [
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
const KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION = [
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
const KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION = [
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
const KINGSTON_BUILDING_OUTLINE_OPACITY = 0.9;
const KINGSTON_BUILDING_COLOR_EXPRESSION = buildBuildingColorExpression(
  BUILDING_LABEL_CANONICAL_EXPRESSION,
  KINGSTON_BUILDING_VISIBLE_LABELS,
  KINGSTON_BUILDING_FALLBACK_COLOR,
  KINGSTON_BUILDING_COLOR_OVERRIDES
);
const KINGSTON_BUILDING_VISIBLE_FILTER = [
  "match",
  ["downcase", BUILDING_LABEL_CANONICAL_EXPRESSION],
  KINGSTON_BUILDING_VISIBLE_LABELS_LOWER,
  true,
  false
];
const BUILDING_RENDER_FILTER = [
  "all",
  ["!=", ["get", "building"], "parking"],
  ["!=", ["get", "building"], "garage"],
  KINGSTON_BUILDING_VISIBLE_FILTER
];
const KINGSTON_BUILDING_LABEL_OFFSET_EXPRESSION = [
  "coalesce",
  ["get", "label_offset"],
  ["literal", [0, 0]]
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
const KINGSTON_FIELD_LABEL_TEXT_SIZE_EXPRESSION = [
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
const KINGSTON_FIELD_LABEL_GEOJSON = {
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
const ensureRoadLayer = (map, city, initialFilter, lineColorExpression, textColorExpression, labelTextExpression) => {
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
const ensureBuildingLayer = (map, city) => {
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
const resetRoadSource = (map, city, initialFilter, lineColorExpression, textColorExpression, labelTextExpression) => {
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
const resetBuildingSource = (map, city) => {
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
function MapView() {
  const initialRoutePathname = typeof window === "undefined" ? "/" : getRoutePathname();
  const initialCity = typeof window === "undefined" ? DEFAULT_CITY : getCityFromPathname(initialRoutePathname);
  const initialTokens = CITY_CONFIG[initialCity].defaultTokens;
  const initialIsBuildingQuizActive = typeof window === "undefined" ? false : Boolean(CITY_CONFIG[initialCity].buildingTilePath) && getBuildingQuizFromPathname(initialRoutePathname);
  const initialIsQuizActive = typeof window === "undefined" ? false : !initialIsBuildingQuizActive && getQuizFromPathname(initialRoutePathname);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const mapCityRef = useRef(initialCity);
  const roadSourceContentSeenRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [roadsLoading, setRoadsLoading] = useState(true);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [activeRoadTokens, setActiveRoadTokens] = useState(
    initialTokens
  );
  const [quizRoadTokens, setQuizRoadTokens] = useState(
    initialTokens
  );
  const [roadCatalog, setRoadCatalog] = useState(null);
  const [roadInput, setRoadInput] = useState("");
  const [isEditingRoads, setIsEditingRoads] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [includeGatineauRoads, setIncludeGatineauRoads] = useState(true);
  const [city, setCity] = useState(initialCity);
  const [isQuizActive, setIsQuizActive] = useState(initialIsQuizActive);
  const [isBuildingQuizActive, setIsBuildingQuizActive] = useState(
    initialIsBuildingQuizActive
  );
  const [quizTargetToken, setQuizTargetToken] = useState(null);
  const [quizFoundTokens, setQuizFoundTokens] = useState([]);
  const [quizCorrectTokens, setQuizCorrectTokens] = useState([]);
  const [quizIncorrectTokens, setQuizIncorrectTokens] = useState([]);
  const [quizMessage, setQuizMessage] = useState(null);
  const [quizQueue, setQuizQueue] = useState([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizGuessCount, setQuizGuessCount] = useState(0);
  const [quizResultState, setQuizResultState] = useState("idle");
  const [buildingQuizTargetLabel, setBuildingQuizTargetLabel] = useState(null);
  const [buildingQuizFoundLabels, setBuildingQuizFoundLabels] = useState([]);
  const [buildingQuizCorrectLabels, setBuildingQuizCorrectLabels] = useState([]);
  const [buildingQuizIncorrectLabels, setBuildingQuizIncorrectLabels] = useState([]);
  const [buildingQuizMessage, setBuildingQuizMessage] = useState(
    null
  );
  const [buildingQuizQueue, setBuildingQuizQueue] = useState([]);
  const [buildingQuizCorrectCount, setBuildingQuizCorrectCount] = useState(0);
  const [buildingQuizGuessCount, setBuildingQuizGuessCount] = useState(0);
  const [buildingQuizResultState, setBuildingQuizResultState] = useState("idle");
  const quizAttemptedTokenRef = useRef(null);
  const quizFoundTokensRef = useRef([]);
  const quizQueueRef = useRef([]);
  const quizRoadTokensRef = useRef(initialTokens);
  const quizResultTimeoutRef = useRef(
    null
  );
  const buildingQuizAttemptLabelRef = useRef(null);
  const buildingQuizFoundLabelsRef = useRef([]);
  const buildingQuizQueueRef = useRef([]);
  const buildingQuizLabelsRef = useRef([]);
  const buildingQuizResultTimeoutRef = useRef(null);
  const buildingQuizTransitionIdRef = useRef(0);
  const buildingQuizTransitionAttemptRef = useRef(0);
  const buildingQuizMoveEndHandlerRef = useRef(
    null
  );
  const buildingLabelUpdateFrameRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const hasInitializedQuizRef = useRef(false);
  const hasInitializedBuildingQuizRef = useRef(false);
  const buildingViewRestoreRef = useRef(null);
  const tokenLabelOverrides = city === "montreal" ? MONTREAL_REF_LABEL_OVERRIDES : city === "ottawa" ? OTTAWA_REF_LABEL_OVERRIDES : city === "kingston" ? KINGSTON_NAME_LABEL_OVERRIDES : null;
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
    () => city === "kingston" ? KINGSTON_BUILDING_DISPLAY_LABELS : [],
    [city]
  );
  const roadIndex = useMemo(
    () => roadCatalog ? buildRoadIndex(roadCatalog) : null,
    [roadCatalog]
  );
  const aliasTokenByValue = useMemo(() => {
    const baseAliases = roadIndex?.aliasTokenByValue;
    const extraAliases = city === "ottawa" ? OTTAWA_ALIAS_TOKEN_BY_VALUE : null;
    if (!baseAliases && !extraAliases) return null;
    const merged = /* @__PURE__ */ new Map();
    if (baseAliases) {
      baseAliases.forEach((value, key) => merged.set(key, value));
    }
    if (extraAliases) {
      extraAliases.forEach((value, key) => merged.set(key, value));
    }
    return merged;
  }, [roadIndex, city]);
  const roadMatchIndex = useMemo(
    () => roadIndex ? buildRoadMatchIndex(
      roadIndex,
      effectiveActiveRoadTokens,
      tokenLabelOverrides
    ) : null,
    [roadIndex, effectiveActiveRoadTokens, tokenLabelOverrides]
  );
  const quizRoadMatchIndex = useMemo(
    () => roadIndex ? buildRoadMatchIndex(
      roadIndex,
      effectiveQuizRoadTokens,
      tokenLabelOverrides
    ) : null,
    [roadIndex, effectiveQuizRoadTokens, tokenLabelOverrides]
  );
  const quizFoundMatchIndex = useMemo(
    () => roadIndex ? buildRoadMatchIndex(roadIndex, quizFoundTokens, tokenLabelOverrides) : null,
    [roadIndex, quizFoundTokens, tokenLabelOverrides]
  );
  const quizPromptLabel = useMemo(() => {
    if (!quizTargetToken) return null;
    return quizRoadMatchIndex?.tokenLabels.get(quizTargetToken) ?? tokenLabelOverrides?.get(quizTargetToken) ?? quizTargetToken;
  }, [quizTargetToken, quizRoadMatchIndex, tokenLabelOverrides]);
  const quizColorOverrides = useMemo(() => {
    if (!quizCorrectTokens.length && !quizIncorrectTokens.length) {
      return null;
    }
    const overrides = {};
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
    const incorrect = [];
    const correct = [];
    quizFoundTokens.forEach((token) => {
      if (incorrectSet.has(token)) {
        incorrect.push(token);
      } else {
        correct.push(token);
      }
    });
    return [...incorrect, ...correct];
  }, [quizFoundTokens, quizIncorrectTokens]);
  const listedRoads = useMemo(() => {
    const tokenLabels = roadMatchIndex?.tokenLabels;
    return [...effectiveActiveRoadTokens].map((token) => ({
      token,
      label: tokenLabels?.get(token) ?? tokenLabelOverrides?.get(token) ?? token
    })).sort((a, b) => {
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
    const quizSegment = isBuildingQuizActive ? BUILDINGS_PATH_SEGMENT : isQuizActive ? QUIZ_PATH_SEGMENT : "";
    const targetPath = `/${[segment, quizSegment].filter(Boolean).join("/")}`;
    const currentPath = getRoutePathname();
    const url = new URL(window.location.href);
    if (normalizePathname(currentPath) === normalizePathname(targetPath) && url.pathname === basePath) {
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
    const nextQuizActive = isInitialLoadRef.current ? initialIsQuizActive : false;
    const nextBuildingQuizActive = isInitialLoadRef.current ? initialIsBuildingQuizActive : false;
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
    (event) => {
      event.preventDefault();
      const entries = roadInput.split(/[,\n]/).map((entry) => normalizeRoadToken(entry)).filter(Boolean).map((entry) => aliasTokenByValue?.get(entry) ?? entry);
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
  const handleRemoveRoad = useCallback((token) => {
    setActiveRoadTokens((prev) => prev.filter((entry) => entry !== token));
  }, []);
  const clearQuizResultTimeout = useCallback(() => {
    if (quizResultTimeoutRef.current) {
      clearTimeout(quizResultTimeoutRef.current);
      quizResultTimeoutRef.current = null;
    }
  }, []);
  const showQuizResult = useCallback(
    (isCorrect) => {
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
    (excludeTokens, roadTokens) => {
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
      nextTarget ? null : getQuizEmptyMessage(quizCorrectCount, quizGuessCount)
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
      nextQueue.length ? null : mapLoaded ? getQuizEmptyMessage(0, 0) : "Map is still loading. Try again in a moment."
    );
    setQuizCorrectCount(0);
    setQuizGuessCount(0);
    hasInitializedQuizRef.current = true;
  }, [
    buildQuizQueue,
    clearQuizResultTimeout,
    effectiveActiveRoadTokens,
    mapLoaded
  ]);
  const clearBuildingQuizResultTimeout = useCallback(() => {
    if (buildingQuizResultTimeoutRef.current) {
      clearTimeout(buildingQuizResultTimeoutRef.current);
      buildingQuizResultTimeoutRef.current = null;
    }
  }, []);
  const showBuildingQuizResult = useCallback(
    (isCorrect) => {
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
        minZoom: map.getMinZoom()
      };
    }
    const applyDefaultBounds = () => {
      map.setMaxBounds(CITY_CONFIG.kingston.mapBounds);
      map.setMinZoom(ROAD_TILE_MIN_ZOOM);
    };
    const currentCenter = map.getCenter();
    const needsMove = Math.abs(currentCenter.lng - KINGSTON_CAMPUS_CENTER[0]) > 1e-4 || Math.abs(currentCenter.lat - KINGSTON_CAMPUS_CENTER[1]) > 1e-4 || Math.abs(map.getZoom() - targetZoom) > 0.01;
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
    const handleMoveEnd = (event) => {
      const eventData = event;
      const center = map.getCenter();
      const isAtTarget = Math.abs(center.lng - KINGSTON_CAMPUS_CENTER[0]) < 2e-4 && Math.abs(center.lat - KINGSTON_CAMPUS_CENTER[1]) < 2e-4 && Math.abs(map.getZoom() - targetZoom) < 0.02;
      const isTransitionEvent = eventData.campusTransitionId === transitionId;
      if (!isTransitionEvent && !isAtTarget) {
        return;
      }
      if (!isAtTarget) {
        if (buildingQuizTransitionAttemptRef.current >= 1) {
          map.jumpTo({
            center: KINGSTON_CAMPUS_CENTER,
            zoom: targetZoom
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
          essential: true
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
      essential: true
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
      layers: [BUILDING_FILL_LAYER_ID]
    });
    const allowedLabels = isBuildingQuizActive ? new Set(buildingQuizFoundLabels) : null;
    const data = buildBuildingLabelFeatureCollection(features, allowedLabels);
    labelSource.setData(data);
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
      buildingQuizTargetLabel
    ];
    const [nextTarget, ...rest] = nextQueue;
    buildingQuizQueueRef.current = rest;
    setBuildingQuizQueue(rest);
    setBuildingQuizTargetLabel(nextTarget ?? null);
    setBuildingQuizMessage(
      nextTarget ? null : getBuildingQuizEmptyMessage(
        buildingQuizCorrectCount,
        buildingQuizGuessCount
      )
    );
  }, [
    buildingQuizCorrectCount,
    buildingQuizGuessCount,
    buildingQuizTargetLabel,
    clearBuildingQuizResultTimeout
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
      nextQueue.length ? null : mapLoaded ? getBuildingQuizEmptyMessage(0, 0) : "Map is still loading. Try again in a moment."
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
    mapLoaded
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
    stopQuiz
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
        const data = await response.json();
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
      style: buildRasterStyle(rasterScale),
      center: CITY_CONFIG[initialCity].center,
      zoom: CITY_CONFIG[initialCity].zoom,
      maxBounds: CITY_CONFIG[initialCity].mapBounds,
      minZoom: ROAD_TILE_MIN_ZOOM,
      attributionControl: false
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
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleResize());
    if (resizeObserver) {
      resizeObserver.observe(mapContainer.current);
    }
    const visualViewport = window.visualViewport ?? null;
    visualViewport?.addEventListener("resize", scheduleResize);
    visualViewport?.addEventListener("scroll", scheduleResize);
    scheduleResize();
    const handleSourceData = (event) => {
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
        void 0,
        defaultFilterOverrides,
        defaultGlobalFilters,
        { highwayRefTokens: defaultHighwayRefs }
      );
      const defaultLabelText = buildRoadLabelTextExpression(initialCity, {
        useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
          initialCity,
          initialTokens
        )
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
      void 0,
      nextFilterOverrides,
      nextGlobalFilters,
      { highwayRefTokens: nextHighwayRefs }
    );
    const nextLabelText = buildRoadLabelTextExpression(city, {
      useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
        city,
        nextTokens
      )
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
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const highlightTokens = isQuizActive ? effectiveQuizRoadTokens : effectiveActiveRoadTokens;
    const highlightMatchIndex = isQuizActive ? quizRoadMatchIndex : roadMatchIndex;
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
    const baseLineColor = isQuizActive ? buildRoadColorExpression(
      quizColorTokens,
      quizFoundMatchIndex,
      QUIZ_BASE_ROAD_COLOR,
      quizColorOverrides ?? void 0
    ) : buildRoadColorExpression(effectiveActiveRoadTokens, roadMatchIndex);
    const lineColor = isBuildingQuizMode ? BUILDING_QUIZ_ROAD_COLOR : baseLineColor;
    const labelFilterOverrides = getRoadFilterOverrides(city, labelTokens);
    const labelGlobalFilters = getRoadGlobalFilters(city, includeGatineauRoads);
    const labelFilter = isQuizActive ? buildRoadFilter(
      labelTokens,
      labelMatchIndex,
      labelFilterOverrides,
      labelGlobalFilters,
      { highwayRefTokens: highwayRefs }
    ) : filter;
    const textColor = buildContrastingTextColorExpression(lineColor);
    const labelOpacity = isQuizActive ? buildRoadOpacityExpression(labelTokens, labelMatchIndex, 0) : 1;
    const labelHaloColor = lineColor;
    const labelHaloWidth = isQuizActive ? ["*", labelOpacity, 2] : 2;
    const labelTextExpression = buildRoadLabelTextExpression(city, {
      useChaudiereBridgeOverride: shouldUseChaudiereBridgeOverride(
        city,
        labelTokens
      )
    });
    const labelTextSize = isBuildingQuizMode ? BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION : ROAD_LABEL_SIZE_EXPRESSION;
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
    roadMatchIndex
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
    quizTargetToken
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
    const baseColor = isBuildingQuizActive ? KINGSTON_BUILDING_QUIZ_BASE_COLOR : isQuizActive ? KINGSTON_BUILDING_ROAD_QUIZ_COLOR : KINGSTON_BUILDING_COLOR_EXPRESSION;
    const fillColor = isBuildingQuizActive ? buildBuildingQuizColorExpression(
      BUILDING_LABEL_DISPLAY_EXPRESSION,
      buildingQuizCorrectLabels,
      buildingQuizIncorrectLabels,
      baseColor
    ) : baseColor;
    map.setPaintProperty(BUILDING_FILL_LAYER_ID, "fill-color", fillColor);
    const fillOpacity = isBuildingQuizActive ? KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION : isQuizActive ? KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION : KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION;
    map.setPaintProperty(BUILDING_FILL_LAYER_ID, "fill-opacity", fillOpacity);
    if (map.getLayer(BUILDING_OUTLINE_LAYER_ID)) {
      const outlineColor = isBuildingQuizActive ? KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR : isQuizActive ? KINGSTON_BUILDING_ROAD_QUIZ_COLOR : KINGSTON_BUILDING_COLOR_EXPRESSION;
      map.setPaintProperty(BUILDING_OUTLINE_LAYER_ID, "line-color", outlineColor);
      map.setPaintProperty(
        BUILDING_OUTLINE_LAYER_ID,
        "line-opacity",
        KINGSTON_BUILDING_OUTLINE_OPACITY
      );
    }
    if (map.getLayer(BUILDING_LABEL_LAYER_ID)) {
      const labelHaloColor = isBuildingQuizActive ? buildBuildingQuizColorExpression(
        ["get", "label"],
        buildingQuizCorrectLabels,
        buildingQuizIncorrectLabels,
        KINGSTON_BUILDING_LABEL_HALO_COLOR
      ) : KINGSTON_BUILDING_LABEL_HALO_COLOR;
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
    mapLoaded
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || city !== "kingston") return;
    if (!map.getSource(BUILDING_LABEL_SOURCE_ID)) return;
    scheduleBuildingLabelUpdate();
    const handleMoveEnd = () => scheduleBuildingLabelUpdate();
    const handleSourceData = (event) => {
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
    const fieldLabelVisibility = isQuizActive || isBuildingQuizActive ? "none" : "visible";
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
    scheduleBuildingLabelUpdate
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
    const handleRoadClick = (event) => {
      const QUIZ_HITBOX_PX = 10;
      const { x, y } = event.point;
      const bbox = [
        [x - QUIZ_HITBOX_PX, y - QUIZ_HITBOX_PX],
        [x + QUIZ_HITBOX_PX, y + QUIZ_HITBOX_PX]
      ];
      const features = map.queryRenderedFeatures(bbox, { layers: [ROAD_LAYER_ID] });
      if (!features.length) return;
      if (quizFoundTokensRef.current.includes(quizTargetToken)) return;
      if (quizAttemptedTokenRef.current === quizTargetToken) return;
      quizAttemptedTokenRef.current = quizTargetToken;
      const matchedTokens = getQuizFeatureTokens(features, quizRoadMatchIndex);
      const isMatch = matchedTokens.has(quizTargetToken) || features.some(
        (feature) => featureMatchesToken(feature, tokenParts, quizTargetToken)
      );
      const nextGuessCount = quizGuessCount + 1;
      const nextCorrectCount = quizCorrectCount + (isMatch ? 1 : 0);
      showQuizResult(isMatch);
      setQuizGuessCount((count) => count + 1);
      if (isMatch) {
        setQuizCorrectCount((count) => count + 1);
        setQuizCorrectTokens(
          (tokens) => tokens.includes(quizTargetToken) ? tokens : [...tokens, quizTargetToken]
        );
      } else {
        setQuizIncorrectTokens(
          (tokens) => tokens.includes(quizTargetToken) ? tokens : [...tokens, quizTargetToken]
        );
      }
      const nextFound = [...quizFoundTokensRef.current, quizTargetToken];
      quizFoundTokensRef.current = nextFound;
      setQuizFoundTokens(nextFound);
      let nextTarget = null;
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
        nextTarget ? null : getQuizEmptyMessage(nextCorrectCount, nextGuessCount)
      );
    };
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
    showQuizResult
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !isBuildingQuizActive || !buildingQuizTargetLabel) {
      return;
    }
    const handleBuildingClick = (event) => {
      const QUIZ_HITBOX_PX = 10;
      const { x, y } = event.point;
      const bbox = [
        [x - QUIZ_HITBOX_PX, y - QUIZ_HITBOX_PX],
        [x + QUIZ_HITBOX_PX, y + QUIZ_HITBOX_PX]
      ];
      const features = map.queryRenderedFeatures(bbox, {
        layers: [BUILDING_FILL_LAYER_ID]
      });
      if (!features.length) return;
      if (buildingQuizFoundLabelsRef.current.includes(buildingQuizTargetLabel)) {
        return;
      }
      if (buildingQuizAttemptLabelRef.current === buildingQuizTargetLabel) {
        return;
      }
      buildingQuizAttemptLabelRef.current = buildingQuizTargetLabel;
      const isMatch = features.some(
        (feature) => buildingFeatureMatchesLabel(feature, buildingQuizTargetLabel)
      );
      const nextGuessCount = buildingQuizGuessCount + 1;
      const nextCorrectCount = buildingQuizCorrectCount + (isMatch ? 1 : 0);
      showBuildingQuizResult(isMatch);
      setBuildingQuizGuessCount((count) => count + 1);
      if (isMatch) {
        setBuildingQuizCorrectCount((count) => count + 1);
        setBuildingQuizCorrectLabels(
          (labels) => labels.includes(buildingQuizTargetLabel) ? labels : [...labels, buildingQuizTargetLabel]
        );
      }
      if (!isMatch) {
        setBuildingQuizIncorrectLabels(
          (labels) => labels.includes(buildingQuizTargetLabel) ? labels : [...labels, buildingQuizTargetLabel]
        );
      }
      const nextFound = [
        ...buildingQuizFoundLabelsRef.current,
        buildingQuizTargetLabel
      ];
      buildingQuizFoundLabelsRef.current = nextFound;
      setBuildingQuizFoundLabels(nextFound);
      let nextTarget = null;
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
        nextTarget ? null : getBuildingQuizEmptyMessage(nextCorrectCount, nextGuessCount)
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
    showBuildingQuizResult
  ]);
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
  const isRoadFinalScore = !quizTargetToken && quizGuessCount > 0 && quizMessage?.startsWith("Final score") === true;
  const roadQuizPanelLabel = isRoadFinalScore ? "Final score" : "Find";
  const roadQuizPanelState = quizTargetToken || isRoadFinalScore ? "ready" : "empty";
  const roadQuizPanelValue = quizPromptLabel ?? (isRoadFinalScore ? roadQuizScoreText : quizMessage ?? "Pan or zoom to load a prompt.");
  const roadQuizScoreLabel = quizResultState === "correct" ? "Correct!" : quizResultState === "incorrect" ? "Incorrect." : "Score";
  const buildingQuizScoreText = `${buildingQuizCorrectCount}/${buildingQuizGuessCount}`;
  const isBuildingFinalScore = !buildingQuizTargetLabel && buildingQuizGuessCount > 0 && buildingQuizMessage?.startsWith("Final score") === true;
  const buildingQuizPanelLabel = isBuildingFinalScore ? "Final score" : "Find";
  const buildingQuizPanelState = buildingQuizTargetLabel || isBuildingFinalScore ? "ready" : "empty";
  const buildingQuizPanelValue = buildingQuizTargetLabel ?? (isBuildingFinalScore ? buildingQuizScoreText : buildingQuizMessage ?? "Pan or zoom to load a prompt.");
  const buildingQuizScoreLabel = buildingQuizResultState === "correct" ? "Correct!" : buildingQuizResultState === "incorrect" ? "Incorrect." : "Score";
  const showRoadsLoading = roadsLoading || isCatalogLoading;
  const activeQuiz = isQuizActive ? {
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
    skipLabel: "Skip Road"
  } : isBuildingQuizActive ? {
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
    skipLabel: "Skip Building"
  } : null;
  return <div className="app-shell">
      <div ref={mapContainer} className="map-canvas" />
      {showRoadsLoading && <div className="roads-loading" role="status" aria-live="polite">
          Roads loading...
        </div>}
      <aside
    className="control-panel"
    data-collapsed={isPanelCollapsed ? "true" : "false"}
  >
        {activeQuiz ? <div className="quiz-only">
            <div
    className="quiz-panel"
    data-state={activeQuiz.panelState}
  >
              <span className="quiz-label">{activeQuiz.panelLabel}</span>
              <span className="quiz-value">
                {activeQuiz.panelValue}
              </span>
              {!activeQuiz.isFinalScore && <div
    className="quiz-score-inline"
    data-state={activeQuiz.resultState}
  >
                  <span className="quiz-score-label">
                    {activeQuiz.scoreLabel}
                  </span>
                  <span className="quiz-score-value">
                    {activeQuiz.scoreText}
                  </span>
                </div>}
            </div>
            {!activeQuiz.isFinalScore && <div className="quiz-score" data-state={activeQuiz.resultState}>
                <span className="quiz-score-label">
                  {activeQuiz.scoreLabel}
                </span>
                <span className="quiz-score-value">{activeQuiz.scoreText}</span>
              </div>}
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
          </div> : <>
            <div className="panel-header">
              <p className="eyebrow">Road Learning Tool</p>
              <h1>{activeCity.label}</h1>
              {activeCity.tagline && <p className="subhead">{activeCity.tagline}</p>}
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
    onChange={(event) => {
      roadSourceContentSeenRef.current = false;
      setRoadsLoading(true);
      setIsCatalogLoading(true);
      setCity(event.target.value);
    }}
  >
                  {Object.entries(CITY_CONFIG).map(([key, config]) => <option key={key} value={key}>
                      {config.selectLabel ?? config.label}
                    </option>)}
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
              {isEditingRoads && <div className="road-editor">
                  <div className="road-editor-header">
                    <span>Selected Roads</span>
                    <span>{listedRoads.length} shown</span>
                  </div>
                  {city === "ottawa" && <div className="gatineau-toggle">
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
    onClick={() => setIncludeGatineauRoads((prev) => !prev)}
  >
                        <span className="toggle-thumb" />
                        <span className="toggle-text toggle-text-yes">Yes</span>
                        <span className="toggle-text toggle-text-no">No</span>
                      </button>
                    </div>}
                  <ul className="road-list">
                    {listedRoads.length === 0 ? <li className="road-empty">
                        No roads selected yet. Add a road name or ref below.
                      </li> : listedRoads.map((road) => <li key={road.token} className="road-item">
                          <span className="road-name">{road.label}</span>
                          <button
    type="button"
    className="road-remove"
    onClick={() => handleRemoveRoad(road.token)}
    aria-label={`Remove ${road.label}`}
  >
                            X
                          </button>
                        </li>)}
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
                </div>}
              <div className="quiz-toggle-stack">
                <button
    type="button"
    className="quiz-toggle"
    data-active={isQuizActive ? "true" : "false"}
    onClick={handleQuizToggle}
  >
                  {roadQuizButtonLabel}
                </button>
                {city === "kingston" && <button
    type="button"
    className="quiz-toggle buildings-quiz-toggle"
    data-active={isBuildingQuizActive ? "true" : "false"}
    onClick={handleBuildingQuizToggle}
  >
                    Buildings Quiz
                  </button>}
              </div>
            </div>
          </>}
      </aside>
    </div>;
}
export {
  MapView as default
};
