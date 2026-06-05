export const DEFAULT_CITY = "ottawa";
export const BASE_TILE_SIZE = 256;
export const getRasterScale = () => {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio > 1 ? 2 : 1;
};
export const buildRasterStyle = (scale) => {
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
export const ROAD_SOURCE_ID = "roads-source";
export const ROAD_BASE_LAYER_ID = "roads-base";
export const ROAD_LAYER_ID = "roads-line";
export const ROAD_LABEL_LAYER_ID = "roads-label";
export const ROAD_SOURCE_LAYER = "roads";
export const ROAD_TILE_MIN_ZOOM = 2;
export const ROAD_TILE_MAX_ZOOM = 14;
export const BUILDING_SOURCE_ID = "buildings-source";
export const BUILDING_FILL_LAYER_ID = "buildings-fill";
export const BUILDING_OUTLINE_LAYER_ID = "buildings-outline";
export const BUILDING_LABEL_SOURCE_ID = "buildings-label-source";
export const BUILDING_LABEL_LAYER_ID = "buildings-label";
export const BUILDING_SOURCE_LAYER = "buildings";
export const BUILDING_TILE_MIN_ZOOM = 12;
export const BUILDING_TILE_MAX_ZOOM = 16;
export const KINGSTON_FIELD_LABEL_SOURCE_ID = "kingston-field-labels-source";
export const KINGSTON_FIELD_LABEL_LAYER_ID = "kingston-field-labels";
export const POPULAR_ROADS_OTTAWA = [
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
export const POPULAR_ROADS_MONTREAL = [
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
export const POPULAR_ROADS_KINGSTON = [
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
export const POPULAR_ROAD_REFS_OTTAWA = ["417", "416", "174", "50", "5"];
export const POPULAR_ROAD_REFS_MONTREAL = [
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
export const POPULAR_ROADS_BY_CITY = {
  ottawa: POPULAR_ROADS_OTTAWA,
  montreal: POPULAR_ROADS_MONTREAL,
  kingston: POPULAR_ROADS_KINGSTON
};
export const POPULAR_ROAD_REFS_BY_CITY = {
  ottawa: POPULAR_ROAD_REFS_OTTAWA,
  montreal: POPULAR_ROAD_REFS_MONTREAL,
  kingston: []
};
export const ALL_POPULAR_ROADS = [
  ...POPULAR_ROADS_BY_CITY.ottawa,
  ...POPULAR_ROADS_BY_CITY.montreal
];
export const toDefaultToken = (value) => value.trim().toLowerCase();
export const POPULAR_ROAD_NAME_SET = new Set(
  ALL_POPULAR_ROADS.map((name) => toDefaultToken(name))
);
export const RESIDENTIAL_DEFAULT_POPULAR_ROADS = [
  "George Street",
  "York Street",
  "Clarence Street",
  "St. Patrick Street",
  "Albert Street",
  "Boulevard des Allumetti\xE8res",
  "Boulevard Alexandre-Tach\xE9",
  "Boulevard Maisonneuve"
];
export const RESIDENTIAL_POPULAR_ROAD_NAME_SET = new Set(
  RESIDENTIAL_DEFAULT_POPULAR_ROADS.map((name) => toDefaultToken(name))
);
export const MONTREAL_REF_LABEL_OVERRIDES = new Map(
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
export const OTTAWA_REF_LABEL_OVERRIDES = new Map(
  [
    ["50", "50"],
    ["5", "Avenue de la Gatineau (A5)"]
  ].map(([ref, label]) => [toDefaultToken(ref), label])
);
export const OTTAWA_REF_LABEL_EXCLUSIONS = /* @__PURE__ */ new Map([
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
export const OTTAWA_ALIAS_TOKEN_BY_VALUE = new Map(
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
export const OTTAWA_HIGHWAY_REF_TOKENS = new Set(
  ["50", "5"].map((ref) => toDefaultToken(ref))
);
export const OTTAWA_NAME_LABEL_OVERRIDES = new Map(
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
export const KINGSTON_NAME_LABEL_OVERRIDES = new Map(
  [
    ["King Street", "King Street"],
    ["King Street East", "King Street"],
    ["King Street West", "King Street"]
  ].map(([name, label]) => [toDefaultToken(name), label])
);
export const buildDefaultRoadTokens = (names, refs) => [
  ...names.map((name) => toDefaultToken(name)),
  ...refs.map((ref) => toDefaultToken(ref))
];
export const DEFAULT_ROAD_TOKENS_BY_CITY = {
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
export const OTTAWA_TILE_BOUNDS = [
  -76.046145,
  45.179021,
  -75.368409,
  45.57046
];
export const MONTREAL_TILE_BOUNDS = [
  -73.953278,
  45.394652,
  -73.353682,
  45.697687
];
export const KINGSTON_TILE_BOUNDS = [
  -76.528833,
  44.217435,
  -76.471204,
  44.25584
];
export const KINGSTON_CENTER_OFFSET = [6e-3, -0.011];
export const KINGSTON_CAMPUS_CENTER = [-76.495056, 44.22626];
export const KINGSTON_CAMPUS_ZOOM = 15.5;
export const KINGSTON_CAMPUS_MOBILE_ZOOM = 14.8;
export const buildMapBounds = (bounds, padX = 0.8, padY = 0.4) => [
  bounds[0] - padX,
  bounds[1] - padY,
  bounds[2] + padX,
  bounds[3] + padY
];
export const buildBoundsCenter = (bounds) => [
  (bounds[0] + bounds[2]) / 2,
  (bounds[1] + bounds[3]) / 2
];
export const getQuizResultDuration = () => {
  if (typeof window === "undefined") return 500;
  return window.matchMedia("(max-width: 900px)").matches ? 700 : 500;
};
export const getKingstonCampusZoom = () => {
  if (typeof window === "undefined") return KINGSTON_CAMPUS_ZOOM;
  return window.matchMedia("(max-width: 900px)").matches ? KINGSTON_CAMPUS_MOBILE_ZOOM : KINGSTON_CAMPUS_ZOOM;
};
export const CITY_CONFIG = {
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
export const resolveStaticUrl = (path) => {
  if (typeof window === "undefined") return path;
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const baseHref = base.href.endsWith("/") ? base.href : `${base.href}/`;
  return `${baseHref}${path.replace(/^\/+/, "")}`;
};
export const getRoadTileUrl = (city) => resolveStaticUrl(CITY_CONFIG[city].tilePath);
export const getRoadCatalogUrl = (city) => resolveStaticUrl(CITY_CONFIG[city].catalogPath);
export const getBuildingTileUrl = (city) => {
  const path = CITY_CONFIG[city].buildingTilePath;
  return path ? resolveStaticUrl(path) : null;
};
