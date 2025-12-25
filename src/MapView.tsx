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

type CityKey = "ottawa" | "montreal";
type CityConfig = {
  label: string;
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
  "Riverside Drive", "St. Laurent Boulevard", "Montreal Road", "Innes Road", "Blair Road",
  "Vanier Parkway", "Prince of Wales Drive", "Heron Road", "Main Street",
  "Lees Avenue", "King Edward Avenue", "Nicholas Street", "Scott Street",
  "Richmond Road", "Island Park Drive", "Parkdale Avenue", "Terry Fox Drive", "March Road",
  "Kichi Zibi Mikan",
  "Hazeldean Road", "Eagleson Road", "Campeau Drive", "Kanata Avenue",
  "Robertson Road", "Moodie Drive", "Fallowfield Road", "Strandherd Drive", "Leitrim Road",
  "Tenth Line Road", "Walkley Road", "Promenade Vanier Parkway", "Industrial Avenue", "Colonel By Drive",
  "Sussex Drive", "George Street", "York Street", "Clarence Street",
  "Dalhousie Street", "Slater Street", "Albert Street",
  "Metcalfe Street", "O'Connor Street", "Booth Street",
  "Wellington Street West"
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

const POPULAR_ROAD_REFS_OTTAWA = ["417", "416", "174"];
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
};

const POPULAR_ROAD_REFS_BY_CITY: Record<CityKey, string[]> = {
  ottawa: POPULAR_ROAD_REFS_OTTAWA,
  montreal: POPULAR_ROAD_REFS_MONTREAL,
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
    label: "Ottawa",
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
};

const DEFAULT_ROAD_TOKENS = CITY_CONFIG[DEFAULT_CITY].defaultTokens;

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
const MAIN_STREET_DOWNTOWN_FILTER: FilterSpecification = [
  "any",
  ["!=", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
  [
    "all",
    ["==", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
    ["within", MAIN_STREET_DOWNTOWN_POLYGON],
  ],
];


// Label Text
const ROAD_LABEL_TEXT_EXPRESSION: ExpressionSpecification = [
  "coalesce",
  ["get", "name"], 
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "ref"],
  ""
];

const buildRoadLabelTextExpression = (
  city: CityKey
): ExpressionSpecification => {
  if (city !== "montreal") {
    return ROAD_LABEL_TEXT_EXPRESSION;
  }
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

const RESIDENTIAL_HIGHWAY_TYPES = [
  "residential",
  "unclassified",
  "living_street",
  "road",
  "service",
  "pedestrian",
];

const RESIDENTIAL_HIGHWAY_FILTER: FilterSpecification = [
  "in",
  ["get", "highway"],
  ["literal", RESIDENTIAL_HIGHWAY_TYPES],
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

const buildRoadMatchIndex = (
  roadIndex: RoadIndex,
  roadTokens: string[],
  labelOverrides?: Map<string, string> | null
): RoadMatchIndex => {
  const tokenMatchers = roadTokens.map((token) => ({
    token,
    parts: getFoldedTokenParts(token),
  }));
  const matchedNames = new Set<string>();
  const matchedRefs = new Set<string>();
  const strictMatchedNames = new Set<string>();
  const nameMatchesByToken = new Map<string, Set<string>>();
  const refMatchesByToken = new Map<string, Set<string>>();
  const tokenLabels = new Map<string, string>();
  const exactTokens = new Set<string>();
  const preferredPopularMatches = new Map<string, string>();
  const aliasByToken = roadIndex.aliasByToken;

  for (const matcher of tokenMatchers) {
    matchedNames.add(matcher.token);
    if (!nameMatchesByToken.has(matcher.token)) {
      nameMatchesByToken.set(matcher.token, new Set());
    }
    nameMatchesByToken.get(matcher.token)!.add(matcher.token);

    matchedRefs.add(matcher.token);
    if (!refMatchesByToken.has(matcher.token)) {
      refMatchesByToken.set(matcher.token, new Set());
    }
    refMatchesByToken.get(matcher.token)!.add(matcher.token);

    const nameLabel = roadIndex.nameLabelByNormalized.get(matcher.token);
    const refLabel = roadIndex.refLabelByNormalized.get(matcher.token);
    const overrideLabel = labelOverrides?.get(matcher.token);
    const alias = aliasByToken.get(matcher.token);
    if (overrideLabel) {
      tokenLabels.set(matcher.token, overrideLabel);
      exactTokens.add(matcher.token);
    } else if (alias?.label) {
      tokenLabels.set(matcher.token, alias.label);
      exactTokens.add(matcher.token);
    } else if (nameLabel) {
      tokenLabels.set(matcher.token, nameLabel);
      exactTokens.add(matcher.token);
    } else if (refLabel) {
      tokenLabels.set(matcher.token, refLabel);
      exactTokens.add(matcher.token);
    }

    if (POPULAR_ROAD_NAME_SET.has(matcher.token)) {
      const preferred =
        nameLabel
          ? { normalized: matcher.token, label: nameLabel }
          : selectPreferredPopularMatch(matcher.token, matcher.parts, roadIndex);
      if (preferred) {
        preferredPopularMatches.set(matcher.token, preferred.normalized);
        tokenLabels.set(matcher.token, preferred.label);
        exactTokens.add(matcher.token);
      }
    }
  }

  for (const entry of roadIndex.nameEntries) {
    for (const matcher of tokenMatchers) {
      const preferredMatch = preferredPopularMatches.get(matcher.token);
      if (preferredMatch) {
        if (entry.normalized !== preferredMatch) continue;
        strictMatchedNames.add(entry.normalized);
      } else {
        if (!matchesNameTokenParts(matcher.parts, entry.parts)) {
          continue;
        }
        matchedNames.add(entry.normalized);
      }
      if (!nameMatchesByToken.has(matcher.token)) {
        nameMatchesByToken.set(matcher.token, new Set());
      }
      nameMatchesByToken.get(matcher.token)!.add(entry.normalized);
      if (!exactTokens.has(matcher.token)) {
        const currentLabel = tokenLabels.get(matcher.token);
        if (!currentLabel || entry.label.length < currentLabel.length) {
          tokenLabels.set(matcher.token, entry.label);
        }
      }
    }
  }

  for (const entry of roadIndex.refEntries) {
    for (const matcher of tokenMatchers) {
      if (!matchesRefTokenParts(matcher.parts, entry.parts)) {
        continue;
      }
      matchedRefs.add(entry.normalized);
      if (!refMatchesByToken.has(matcher.token)) {
        refMatchesByToken.set(matcher.token, new Set());
      }
      refMatchesByToken.get(matcher.token)!.add(entry.normalized);
      if (!exactTokens.has(matcher.token)) {
        const currentLabel = tokenLabels.get(matcher.token);
        if (!currentLabel || entry.label.length < currentLabel.length) {
          tokenLabels.set(matcher.token, entry.label);
        }
      }
    }
  }

  for (const matcher of tokenMatchers) {
    const alias = aliasByToken.get(matcher.token);
    if (!alias) continue;
    if (alias.names.length) {
      for (const name of alias.names) {
        matchedNames.add(name);
        if (!nameMatchesByToken.has(matcher.token)) {
          nameMatchesByToken.set(matcher.token, new Set());
        }
        nameMatchesByToken.get(matcher.token)!.add(name);
      }
    }
    if (alias.refs.length) {
      for (const ref of alias.refs) {
        matchedRefs.add(ref);
        if (!refMatchesByToken.has(matcher.token)) {
          refMatchesByToken.set(matcher.token, new Set());
        }
        refMatchesByToken.get(matcher.token)!.add(ref);
      }
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

const buildRoadFilter = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null
): FilterSpecification => {
  if (!roadTokens.length) {
    return ["==", 1, 0];
  }
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

  const filters: FilterSpecification[] = [];

  const majorStrictNameFilter = buildStrictNameFilter(
    majorStrictNameTokens,
    MAJOR_HIGHWAY_FILTER
  );
  if (majorStrictNameFilter) {
    filters.push(majorStrictNameFilter);
  }

  const residentialStrictNameFilter = buildStrictNameFilter(
    residentialStrictNameTokens,
    RESIDENTIAL_HIGHWAY_FILTER
  );
  if (residentialStrictNameFilter) {
    filters.push(residentialStrictNameFilter);
  }
    if (looseTokens.length) {
      filters.push([
        "any",
        ...looseTokens.flatMap((token) => [
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
    if (!filters.length) return ["==", 1, 0];
    return [
      "all",
      MAIN_STREET_DOWNTOWN_FILTER,
      ["any", ...filters],
    ] as FilterSpecification;
  }

  const filters: FilterSpecification[] = [];
  const {
    majorPopular: majorPopularStrictNames,
    residentialPopular: residentialPopularStrictNames,
    other: otherStrictNames,
  } = splitNamesByPopularity(matchIndex.strictMatchedNames);

  const {
    majorPopular: majorPopularMatchedNames,
    residentialPopular: residentialPopularMatchedNames,
    other: otherMatchedNames,
  } = splitNamesByPopularity(matchIndex.matchedNames);

  const strictMajorPopularFilter = buildStrictNameFilter(
    majorPopularStrictNames,
    MAJOR_HIGHWAY_FILTER
  );

  const strictResidentialPopularFilter = buildStrictNameFilter(
    residentialPopularStrictNames,
    RESIDENTIAL_HIGHWAY_FILTER
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
    filters.push([
      "all",
      RESIDENTIAL_HIGHWAY_FILTER,
      buildAnyNameInExpression(residentialPopularMatchedNames),
    ]);
  }

  if (otherMatchedNames.length) {
    filters.push(
      buildAnyNameInExpression(otherMatchedNames) as unknown as FilterSpecification
    );
  }
  if (matchIndex.matchedRefs.length) {
    filters.push([
      "in",
      ROAD_REF_EXPRESSION,
      ["literal", matchIndex.matchedRefs],
    ]);
  }
  if (!filters.length) return ["==", 1, 0];
  return [
    "all",
    MAIN_STREET_DOWNTOWN_FILTER,
    ["any", ...filters],
  ] as FilterSpecification;
};

const buildRoadColorExpression = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null,
  fallbackColor: string = DEFAULT_ROAD_COLOR
): ExpressionSpecification | string => {
  if (!roadTokens.length) return fallbackColor;
  if (!matchIndex) {
    const colorPairs = roadTokens.flatMap((token) => {
      const tokenColor = stringToColor(token);
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
    return ["case", ...colorPairs, fallbackColor] as ExpressionSpecification;
  }

  const colorPairs = roadTokens.flatMap((token) => {
    const tokenColor = stringToColor(token);
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

  if (!colorPairs.length) return fallbackColor;
  return ["case", ...colorPairs, fallbackColor] as ExpressionSpecification;
};


const buildRoadOpacityExpression = (
  roadTokens: string[],
  matchIndex?: RoadMatchIndex | null,
  fallbackOpacity = 1
): ExpressionSpecification | number => {
  if (!roadTokens.length) return fallbackOpacity;
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
    return ["case", ...opacityPairs, fallbackOpacity] as ExpressionSpecification;
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

  if (!opacityPairs.length) return fallbackOpacity;
  return ["case", ...opacityPairs, fallbackOpacity] as ExpressionSpecification;
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
  textColorExpression: ExpressionSpecification | string
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
        "text-field": buildRoadLabelTextExpression(city),
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
  textColorExpression: ExpressionSpecification | string
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
    textColorExpression
  );
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapCityRef = useRef<CityKey>(DEFAULT_CITY);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeRoadTokens, setActiveRoadTokens] = useState<string[]>(
    DEFAULT_ROAD_TOKENS
  );
  const [quizRoadTokens, setQuizRoadTokens] = useState<string[]>(
    DEFAULT_ROAD_TOKENS
  );
  const [roadCatalog, setRoadCatalog] = useState<RoadCatalog | null>(null);
  const [roadInput, setRoadInput] = useState("");
  const [isEditingRoads, setIsEditingRoads] = useState(false);
  const [city, setCity] = useState<CityKey>(DEFAULT_CITY);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizTargetToken, setQuizTargetToken] = useState<string | null>(null);
  const [quizFoundTokens, setQuizFoundTokens] = useState<string[]>([]);
  const [quizMessage, setQuizMessage] = useState<string | null>(null);
  const [quizQueue, setQuizQueue] = useState<string[]>([]);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizGuessCount, setQuizGuessCount] = useState(0);
  const [quizResultState, setQuizResultState] =
    useState<QuizResultState>("idle");
  const quizAttemptedTokenRef = useRef<string | null>(null);
  const quizFoundTokensRef = useRef<string[]>([]);
  const quizQueueRef = useRef<string[]>([]);
  const quizRoadTokensRef = useRef<string[]>(DEFAULT_ROAD_TOKENS);
  const quizResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const tokenLabelOverrides =
    city === "montreal" ? MONTREAL_REF_LABEL_OVERRIDES : null;

  const roadIndex = useMemo(
    () => (roadCatalog ? buildRoadIndex(roadCatalog) : null),
    [roadCatalog]
  );
  const aliasTokenByValue = roadIndex?.aliasTokenByValue ?? null;
  const roadMatchIndex = useMemo(
    () =>
      roadIndex
        ? buildRoadMatchIndex(
            roadIndex,
            activeRoadTokens,
            tokenLabelOverrides
          )
        : null,
    [roadIndex, activeRoadTokens, tokenLabelOverrides]
  );
  const quizRoadMatchIndex = useMemo(
    () =>
      roadIndex
        ? buildRoadMatchIndex(roadIndex, quizRoadTokens, tokenLabelOverrides)
        : null,
    [roadIndex, quizRoadTokens, tokenLabelOverrides]
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
  const listedRoads = useMemo<VisibleRoad[]>(() => {
    const tokenLabels = roadMatchIndex?.tokenLabels;
    return [...activeRoadTokens]
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
  }, [activeRoadTokens, roadMatchIndex, tokenLabelOverrides]);

  useEffect(() => {
    const nextTokens = CITY_CONFIG[city].defaultTokens;
    setActiveRoadTokens(nextTokens);
    setQuizRoadTokens(nextTokens);
    setRoadInput("");
    setIsEditingRoads(false);
    setIsQuizActive(false);
    setQuizTargetToken(null);
    setQuizFoundTokens([]);
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

  const handleQuizToggle = useCallback(() => {
    clearQuizResultTimeout();
    setQuizResultState("idle");
    if (isQuizActive) {
      setIsQuizActive(false);
      setQuizTargetToken(null);
      setQuizFoundTokens([]);
      setQuizMessage(null);
      setQuizQueue([]);
      setQuizCorrectCount(0);
      setQuizGuessCount(0);
      quizFoundTokensRef.current = [];
      quizQueueRef.current = [];
      return;
    }

    const nextQuizTokens = [...activeRoadTokens];
    quizRoadTokensRef.current = nextQuizTokens;
    setQuizRoadTokens(nextQuizTokens);
    setIsQuizActive(true);
    setQuizFoundTokens([]);
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
  }, [
    activeRoadTokens,
    buildQuizQueue,
    clearQuizResultTimeout,
    isQuizActive,
    mapLoaded,
  ]);

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
      center: CITY_CONFIG[DEFAULT_CITY].center,
      zoom: CITY_CONFIG[DEFAULT_CITY].zoom,
      maxBounds: CITY_CONFIG[DEFAULT_CITY].mapBounds,
      minZoom: ROAD_TILE_MIN_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    const handleLoad = () => {
      setMapLoaded(true);
      const defaultLineColor = buildRoadColorExpression(DEFAULT_ROAD_TOKENS);
      ensureRoadLayer(
        map,
        DEFAULT_CITY,
        buildRoadFilter(DEFAULT_ROAD_TOKENS),
        defaultLineColor,
        buildContrastingTextColorExpression(defaultLineColor)
      );
      mapCityRef.current = DEFAULT_CITY;
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
    resetRoadSource(
      map,
      city,
      buildRoadFilter(nextTokens),
      nextLineColor,
      buildContrastingTextColorExpression(nextLineColor)
    );
    mapCityRef.current = city;
  }, [city, mapLoaded]);

  // Update Filters on change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const highlightTokens = isQuizActive
      ? quizRoadTokens
      : activeRoadTokens;
    const highlightMatchIndex = isQuizActive
      ? quizRoadMatchIndex
      : roadMatchIndex;
    const labelTokens = isQuizActive ? quizFoundTokens : activeRoadTokens;
    const labelMatchIndex = isQuizActive ? quizFoundMatchIndex : roadMatchIndex;

    const filter = buildRoadFilter(highlightTokens, highlightMatchIndex);
    const lineColor = isQuizActive
      ? buildRoadColorExpression(
          quizFoundTokens,
          quizFoundMatchIndex,
          QUIZ_BASE_ROAD_COLOR
        )
      : buildRoadColorExpression(activeRoadTokens, roadMatchIndex);
    const labelFilter = isQuizActive
      ? buildRoadFilter(labelTokens, labelMatchIndex)
      : filter;
    const textColor = buildContrastingTextColorExpression(lineColor);
const labelOpacity = isQuizActive
      ? buildRoadOpacityExpression(labelTokens, labelMatchIndex, 0)
      : 1;
    const labelHaloColor = lineColor;
const labelHaloWidth = isQuizActive
      ? (["*", labelOpacity, 2] as ExpressionSpecification)
      : 2;

    if (map.getLayer(ROAD_LAYER_ID)) {
      map.setFilter(ROAD_LAYER_ID, filter);
      map.setPaintProperty(ROAD_LAYER_ID, "line-color", lineColor);
    }
    if (map.getLayer(ROAD_LABEL_LAYER_ID)) {
      map.setFilter(ROAD_LABEL_LAYER_ID, labelFilter);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-color", textColor);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-halo-color", labelHaloColor);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-opacity", labelOpacity);
      map.setPaintProperty(ROAD_LABEL_LAYER_ID, "text-halo-width", labelHaloWidth);
    }
  }, [
    activeRoadTokens,
    isQuizActive,
    mapLoaded,
    quizFoundMatchIndex,
    quizFoundTokens,
    quizRoadMatchIndex,
    quizRoadTokens,
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
    quizRoadTokensRef.current = quizRoadTokens;
  }, [quizRoadTokens]);

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
    const handleRoadClick = (
      event: MapMouseEvent & {
        features?: MapGeoJSONFeature[];
      }
    ) => {
      const features =
        event.features ??
        map.queryRenderedFeatures(event.point, { layers: [ROAD_LAYER_ID] });
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

    map.on("click", ROAD_LAYER_ID, handleRoadClick);
    return () => {
      map.off("click", ROAD_LAYER_ID, handleRoadClick);
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
                      {config.label}
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
