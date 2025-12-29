import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import maplibregl, {
  type ExpressionSpecification,
  type FilterSpecification,
  type MapGeoJSONFeature,
  type MapMouseEvent,
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
  catalogPath: string;
  tagline: string;
  defaultTokens: string[];
};
type QuizResultState = "idle" | "correct" | "incorrect";

const DEFAULT_CITY: CityKey = "ottawa";

const BASE_RASTER_STYLE = {
  version: 8,
  sources: {
    googleSat: {
      type: "raster",
      tiles: [
        "https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      attribution: "© Google",
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

const ROAD_SOURCE_ID = "roads-source";
const ROAD_BASE_LAYER_ID = "roads-base";
const ROAD_LAYER_ID = "roads-line";
const ROAD_LABEL_LAYER_ID = "roads-label";
const ROAD_SOURCE_LAYER = "roads";
const ROAD_TILE_MIN_ZOOM = 2;
const ROAD_TILE_MAX_ZOOM = 14;

// --- Popular Roads Data ---
const POPULAR_ROADS_OTTAWA = [
  "Carling Avenue", "Hunt Club Road", "West Hunt Club Road", "Somerset Street West", "Bank Street", "Rideau Street",
  "Elgin Street", "Laurier Avenue", "Laurier Avenue West", "Wellington Street", "Bronson Avenue", "Baseline Road",
  "Merivale Road", "Woodroffe Avenue", "Greenbank Road", "Fisher Avenue",
  "Riverside Drive", "St. Laurent Boulevard", "Montreal Road", "Innes Road", "Blair Road", "Prince of Wales Drive", "Heron Road", "Main Street",
  "Lees Avenue", "King Edward Avenue", "Nicholas Street", "Scott Street",
  "Richmond Road", "Island Park Drive", "Parkdale Avenue", "Terry Fox Drive", "March Road",
  "Kichi Zibi Mikan",
  "Boulevard Alexandre-Taché", "Boulevard des Allumettières",
  "Boulevard Maisonneuve",
  "Alexandra Bridge", "Champlain Bridge", "Chaudière Bridge",
  "Macdonald-Cartier Bridge", "Portage Bridge",
  "Hazeldean Road", "Eagleson Road", "Campeau Drive", "Kanata Avenue",
  "Robertson Road", "Moodie Drive", "Fallowfield Road", "Strandherd Drive", "Leitrim Road",
  "Tenth Line Road", "Walkley Road", "Promenade Vanier Parkway", "Industrial Avenue", "Colonel By Drive",
  "Queen Elizabeth Driveway", "Sussex Drive", "George Street", "York Street", "Clarence Street",
  "Dalhousie Street", "Slater Street", "Albert Street",
  "Metcalfe Street", "O'Connor Street", "Booth Street",
  "Wellington Street West", "Maitland Avenue", "Gladstone Avenue",
  "Ogilvie Road", "St. Joseph Boulevard",
  "Jeanne D'Arc Boulevard", "Aviation Parkway", "Sir-George-\u00c9tienne-Cartier Parkway",
  "St. Patrick Street", "Murray Street", "Beechwood Avenue"
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
  "Victoria Street",
  "Clergy Street",
  "Bader Lane"
];

const POPULAR_ROAD_REFS_OTTAWA = ["417", "416", "174", "5", "50", "148"];
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
    ["5", "A5"],
    ["50", "50"],
    ["148", "Boulevard des Allumetieres"],
  ].map(([ref, label]) => [toDefaultToken(ref), label] as const)
);
const OTTAWA_REF_LABEL_EXCLUSIONS = new Map<string, Set<string>>([
  [
    toDefaultToken("5"),
    new Set(
      [
        "Macdonald-Cartier Bridge",
        "Pont Macdonald-Cartier Bridge",
      ].map((name) => toDefaultToken(name))
    ),
  ],
  [
    toDefaultToken("148"),
    new Set(
      [
        "Bd Maloney O",
        "Bd Maloney Ouest",
        "Boulevard Maloney O",
        "Boulevard Maloney Ouest",
      ].map((name) => toDefaultToken(name))
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
  ["5", "50"].map((ref) => toDefaultToken(ref))
);
const OTTAWA_NAME_LABEL_OVERRIDES = new Map<string, string>(
  [
    ["Pont Alexandra", "Alexandra Bridge"],
    ["Pont Champlain Bridge", "Champlain Bridge"],
    ["Pont Macdonald-Cartier Bridge", "Macdonald-Cartier Bridge"],
    ["Pont du Portage", "Portage Bridge"],
    ["Pont du Portage Bridge", "Portage Bridge"],
    ["Pont de la Chaudière", "Chaudière Bridge"],
    ["Bd Maloney O", "Route 148"],
    ["Bd Maloney Ouest", "Route 148"],
    ["Boulevard Maloney O", "Route 148"],
    ["Boulevard Maloney Ouest", "Route 148"],
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
  -76.544148,
  44.195596,
  -76.425662,
  44.290928,
];
const KINGSTON_CENTER_OFFSET: [number, number] = [-0.009, -0.013];
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
    zoom: 14,
    tileBounds: KINGSTON_TILE_BOUNDS,
    mapBounds: buildMapBounds(KINGSTON_TILE_BOUNDS),
    tilePath: "assets/tiles/kingston/{z}/{x}/{y}.pbf",
    catalogPath: "assets/roads/kingston.json",
    tagline: "Memorize key streets around Queen's University.",
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
const QUIZ_PATH_SEGMENT = "quiz";
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

const ALLUMETIERES_TOKEN = toDefaultToken("Boulevard des Allumettières");
const ALLUMETIERES_COLOR = stringToColor(ALLUMETIERES_TOKEN);

const ROAD_COLOR_OVERRIDES: Record<string, string> = {
  [ALLUMETIERES_TOKEN]: ALLUMETIERES_COLOR,
  [toDefaultToken("148")]: ALLUMETIERES_COLOR,
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
  [toDefaultToken("Ogilvie Road")]: "#0a9396ff",
  [toDefaultToken("174")]: "#eae685ff",
  [toDefaultToken("St. Laurent Boulevard")]: "#f78dbbff",
  [toDefaultToken("Murray Street")]: "#ff6214ff",
  [toDefaultToken("Chaudière Bridge")]: "#b83d99ff",
  [toDefaultToken("Kichi Zibi Mikan")]: "#99d272ff",
  [toDefaultToken("MacDonald-Cartier Bridge")]: "#d69749ff",
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
  "Boulevard Maisonneuve",
  "Boulevard de Maisonneuve",
  "Maisonneuve Street",
].map((name) => toDefaultToken(name));
const GATINEAU_ROAD_REF_TOKENS = ["5", "50", "148"].map((ref) =>
  toDefaultToken(ref)
);
const GATINEAU_ROAD_TOKEN_SET = new Set([
  ...GATINEAU_ROAD_NAME_TOKENS,
  ...GATINEAU_ROAD_REF_TOKENS,
]);
const GATINEAU_EXEMPT_NAME_TOKENS = [
  "Macdonald-Cartier Bridge",
  "Pont Macdonald-Cartier Bridge",
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
            [
              "!",
              ["in", ROAD_NAME_EXPRESSION, ["literal", Array.from(excludedNames)]],
            ],
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
          ["!", ["in", ROAD_NAME_EXPRESSION, ["literal", Array.from(excludedNames)]]],
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
  if (!parts.length) return ["==", 1, 0];
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
    return ["==", 1, 0];
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
    if (!filters.length) return ["==", 1, 0];
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
  if (standardMatchedRefs.length) {
    filters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", standardMatchedRefs],
    ]);
  }
  if (highwayMatchedRefs.length) {
    filters.push([
      "all",
      MAJOR_HIGHWAY_FILTER,
      ["in", ROAD_REF_EXPRESSION, ["literal", highwayMatchedRefs]],
    ]);
  }
  if (extraFilters.length) {
    filters.push(...extraFilters);
  }
  if (!filters.length) return ["==", 1, 0];
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
      pairs.push(
        ["in", ROAD_REF_EXPRESSION, ["literal", refMatches]],
        tokenColor
      );
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
      pairs.push(
        ["in", ROAD_REF_EXPRESSION, ["literal", refMatches]],
        1
      );
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

const collectVisibleRoadParts = (features: MapGeoJSONFeature[]) => {
  const namePartsList: string[][] = [];
  const refPartsList: string[][] = [];
  const seenNames = new Set<string>();
  const seenRefs = new Set<string>();

  for (const feature of features) {
    const properties = feature.properties ?? {};
    const nameValues = [
      properties["name"],
      properties["name:en"],
      properties["name_en"],
    ];

    for (const value of nameValues) {
      if (typeof value !== "string") continue;
      const normalized = normalizeRoadToken(value);
      if (!normalized || seenNames.has(normalized)) continue;
      seenNames.add(normalized);
      namePartsList.push(getNameParts(normalized));
    }

    const refValue = properties["ref"];
    if (typeof refValue !== "string") continue;
    const normalizedRef = normalizeRoadToken(refValue);
    if (!normalizedRef || seenRefs.has(normalizedRef)) continue;
    seenRefs.add(normalizedRef);
    refPartsList.push(getTokenParts(normalizedRef));
  }

  return { namePartsList, refPartsList };
};

const getVisibleRoadTokens = (
  map: maplibregl.Map,
  excludeTokens: Set<string>,
  roadTokens: string[],
  layerId: string = ROAD_BASE_LAYER_ID
) => {
  const features = map.queryRenderedFeatures({
    layers: [layerId],
  });
  if (!features.length) return [];

  const { namePartsList, refPartsList } = collectVisibleRoadParts(features);
  const candidates: string[] = [];

  for (const token of roadTokens) {
    if (excludeTokens.has(token)) continue;
    const tokenParts = getFoldedTokenParts(token);
    const matchesName = namePartsList.some((nameParts) =>
      matchesNameTokenParts(tokenParts, nameParts)
    );
    const matchesRef = refPartsList.some((refParts) =>
      matchesRefTokenParts(tokenParts, refParts)
    );
    if (matchesName || matchesRef) {
      candidates.push(token);
    }
  }

  return candidates;
};

const featureMatchesToken = (
  feature: MapGeoJSONFeature,
  tokenParts: string[]
) => {
  const properties = feature.properties ?? {};
  const nameValues = [
    properties["name"],
    properties["name:en"],
    properties["name_en"],
  ];

  for (const value of nameValues) {
    if (typeof value !== "string") continue;
    const normalized = normalizeRoadToken(value);
    if (!normalized) continue;
    if (matchesNameTokenParts(tokenParts, getNameParts(normalized))) {
      return true;
    }
  }

  const refValue = properties["ref"];
  if (typeof refValue === "string") {
    const normalizedRef = normalizeRoadToken(refValue);
    if (
      normalizedRef &&
      matchesRefTokenParts(tokenParts, getTokenParts(normalizedRef))
    ) {
      return true;
    }
  }

  return false;
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

        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ROAD_TILE_MIN_ZOOM, 9,
          10, 12,
          14, 16
        ],
        
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

export default function MapView() {
  const initialCity =
    typeof window === "undefined"
      ? DEFAULT_CITY
      : getCityFromPathname(getRoutePathname());
  const initialTokens = CITY_CONFIG[initialCity].defaultTokens;
  const initialIsQuizActive =
    typeof window === "undefined"
      ? false
      : getQuizFromPathname(getRoutePathname());
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapCityRef = useRef<CityKey>(initialCity);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeRoadTokens, setActiveRoadTokens] = useState<string[]>(
    initialTokens
  );
  const [quizRoadTokens, setQuizRoadTokens] = useState<string[]>(
    initialTokens
  );
  const [roadCatalog, setRoadCatalog] = useState<RoadCatalog | null>(null);
  const [roadInput, setRoadInput] = useState("");
  const [isEditingRoads, setIsEditingRoads] = useState(false);
  const [includeGatineauRoads, setIncludeGatineauRoads] = useState(true);
  const [city, setCity] = useState<CityKey>(initialCity);
  const [isQuizActive, setIsQuizActive] = useState(initialIsQuizActive);
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
  const quizAttemptedTokenRef = useRef<string | null>(null);
  const quizFoundTokensRef = useRef<string[]>([]);
  const quizQueueRef = useRef<string[]>([]);
  const quizRoadTokensRef = useRef<string[]>(initialTokens);
  const quizResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isInitialLoadRef = useRef(true);
  const hasInitializedQuizRef = useRef(false);
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
    const targetPath = `/${[segment, isQuizActive ? QUIZ_PATH_SEGMENT : ""]
      .filter(Boolean)
      .join("/")}`;
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
  }, [city, isQuizActive]);

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

    quizRoadTokensRef.current = nextTokens;
    quizFoundTokensRef.current = [];
    quizQueueRef.current = [];
    quizAttemptedTokenRef.current = null;
    if (quizResultTimeoutRef.current) {
      clearTimeout(quizResultTimeoutRef.current);
      quizResultTimeoutRef.current = null;
    }
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
      }, 2000);
    },
    [clearQuizResultTimeout]
  );

  const buildQuizQueue = useCallback(
    (excludeTokens: string[], roadTokens: string[]) => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !roadTokens.length) return [];
      const candidates = getVisibleRoadTokens(
        map,
        new Set(excludeTokens),
        roadTokens,
        ROAD_LAYER_ID
      );
      if (!candidates.length) return [];
      return shuffleTokens(candidates);
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

  const handleQuizToggle = useCallback(() => {
    if (isQuizActive) {
      stopQuiz();
      return;
    }
    startQuiz();
  }, [isQuizActive, startQuiz, stopQuiz]);

  useEffect(() => {
    let cancelled = false;
    setRoadCatalog(null);

    const loadCatalog = async () => {
      try {
        const response = await fetch(getRoadCatalogUrl(city));
        if (!response.ok) {
          throw new Error(`Road catalog request failed: ${response.status}`);
        }
        const data = (await response.json()) as RoadCatalog;
        if (cancelled) return;
        setRoadCatalog(data);
      } catch (error) {
        if (cancelled) return;
        console.error("Road catalog error:", error);
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASE_RASTER_STYLE as any,
      center: CITY_CONFIG[initialCity].center,
      zoom: CITY_CONFIG[initialCity].zoom,
      maxBounds: CITY_CONFIG[initialCity].mapBounds,
      minZoom: ROAD_TILE_MIN_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

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
      mapCityRef.current = initialCity;
    };

    map.on("load", handleLoad);
    map.on("error", (e) => {
      console.error("Map Error:", e);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (mapCityRef.current === city) return;

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
    const lineColor = isQuizActive
      ? buildRoadColorExpression(
          quizFoundTokens,
          quizFoundMatchIndex,
          QUIZ_BASE_ROAD_COLOR,
          quizColorOverrides ?? undefined
        )
      : buildRoadColorExpression(effectiveActiveRoadTokens, roadMatchIndex);
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

    if (map.getLayer(ROAD_LAYER_ID)) {
      map.setFilter(ROAD_LAYER_ID, filter);
      map.setPaintProperty(ROAD_LAYER_ID, "line-color", lineColor);
    }
    if (map.getLayer(ROAD_LABEL_LAYER_ID)) {
      map.setFilter(ROAD_LABEL_LAYER_ID, labelFilter);
      map.setLayoutProperty(ROAD_LABEL_LAYER_ID, "text-field", labelTextExpression);
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
    isQuizActive,
    mapLoaded,
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
    quizAttemptedTokenRef.current = null;
  }, [quizTargetToken]);

  useEffect(() => {
    return () => {
      clearQuizResultTimeout();
    };
  }, [clearQuizResultTimeout]);

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

      const isMatch = features.some((feature) =>
        featureMatchesToken(feature, tokenParts)
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
    quizTargetToken,
    showQuizResult,
  ]);

  // Handle City Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { center, zoom, mapBounds } = CITY_CONFIG[city];
    map.setMaxBounds(mapBounds);
    map.flyTo({ center, zoom });
  }, [city]);

  const activeCity = CITY_CONFIG[city];
  const quizScoreText = `${quizCorrectCount}/${quizGuessCount}`;
  const isFinalScore =
    !quizTargetToken &&
    quizGuessCount > 0 &&
    quizMessage?.startsWith("Final score") === true;
  const quizPanelLabel = isFinalScore ? "Final score" : "Find";
  const quizPanelState =
    quizTargetToken || isFinalScore ? "ready" : "empty";
  const quizPanelValue =
    quizPromptLabel ??
    (isFinalScore
      ? quizScoreText
      : quizMessage ?? "Pan or zoom to load a prompt.");
  const quizScoreLabel =
    quizResultState === "correct"
      ? "Correct!"
      : quizResultState === "incorrect"
        ? "Incorrect."
        : "Score";

  return (
    <div className="app-shell">
      <div ref={mapContainer} className="map-canvas" />
      <aside className="control-panel">
        {isQuizActive ? (
          <div className="quiz-only">
            <div
              className="quiz-panel"
              data-state={quizPanelState}
            >
              <span className="quiz-label">{quizPanelLabel}</span>
              <span className="quiz-value">
                {quizPanelValue}
              </span>
            </div>
            {!isFinalScore && (
              <div className="quiz-score" data-state={quizResultState}>
                <span className="quiz-score-label">{quizScoreLabel}</span>
                <span className="quiz-score-value">{quizScoreText}</span>
              </div>
            )}
            <div className="quiz-controls">
              <button
                type="button"
                className="quiz-skip"
                onClick={handleSkipRoad}
                disabled={!quizTargetToken}
              >
                Skip Road
              </button>
              <button
                type="button"
                className="quiz-end"
                onClick={handleQuizToggle}
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
            </div>

            <div className="panel-body">
              <label className="field">
                <span>City</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as CityKey)}
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
              <button
                type="button"
                className="quiz-toggle"
                data-active={isQuizActive ? "true" : "false"}
                onClick={handleQuizToggle}
              >
                Start Quiz
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
