import {
  toDefaultToken,
  POPULAR_ROAD_NAME_SET,
  RESIDENTIAL_POPULAR_ROAD_NAME_SET,
  OTTAWA_REF_LABEL_EXCLUSIONS,
  OTTAWA_HIGHWAY_REF_TOKENS,
  OTTAWA_NAME_LABEL_OVERRIDES,
  OTTAWA_REF_LABEL_OVERRIDES,
  MONTREAL_REF_LABEL_OVERRIDES
} from "./config.js";
import {
  stringToColor,
  DEFAULT_ROAD_COLOR,
  ROAD_COLOR_OVERRIDES
} from "./colors.js";

export const ROAD_NAME_GETTER = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name"],
  ["get", "name_en"],
  ""
];
export const ROAD_NAME_EXPRESSION = ["downcase", ROAD_NAME_GETTER];
export const ROAD_PRIMARY_NAME_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "name"], ""]
];
export const ROAD_ALT_NAME_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "name:en"], ["get", "name_en"], ""]
];
export const ROAD_NAME_EXPRESSIONS = [
  ROAD_PRIMARY_NAME_EXPRESSION,
  // "name"
  ROAD_ALT_NAME_EXPRESSION
  // "name:en" / "name_en"
];
export const buildAnyNameInExpression = (names) => [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", names]]
  )
];
export const buildRefMatchExpression = (refs) => {
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
export const ROAD_REF_EXPRESSION = [
  "downcase",
  ["coalesce", ["get", "ref"], ""]
];
export const MAIN_STREET_TOKEN = "main street";
export const BOOTH_STREET_TOKEN = toDefaultToken("Booth Street");
export const CHAUDIERE_BRIDGE_LABEL = "Chaudi\xE8re Bridge";
export const RUE_CLARENCE_TOKEN = toDefaultToken("Rue Clarence");
export const MAIN_STREET_DOWNTOWN_BOUNDS = [
  -75.72,
  45.39,
  -75.64,
  45.44
];
export const boundsToPolygon = (bounds) => ({
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
export const MAIN_STREET_DOWNTOWN_POLYGON = boundsToPolygon(
  MAIN_STREET_DOWNTOWN_BOUNDS
);
export const CHAUDIERE_BRIDGE_BOUNDS = [
  -75.7202,
  45.4199,
  -75.7177,
  45.4226
];
export const CHAUDIERE_BRIDGE_POLYGON = boundsToPolygon(CHAUDIERE_BRIDGE_BOUNDS);
export const MAIN_STREET_DOWNTOWN_FILTER = [
  "any",
  ["!=", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
  [
    "all",
    ["==", ROAD_NAME_EXPRESSION, MAIN_STREET_TOKEN],
    ["within", MAIN_STREET_DOWNTOWN_POLYGON]
  ]
];
export const CHAUDIERE_BRIDGE_OVERRIDE_MATCH = [
  "all",
  ["within", CHAUDIERE_BRIDGE_POLYGON],
  ["==", ROAD_NAME_EXPRESSION, BOOTH_STREET_TOKEN]
];
export const CHAUDIERE_BRIDGE_OVERRIDE_FILTER = CHAUDIERE_BRIDGE_OVERRIDE_MATCH;
export const RUE_CLARENCE_EXCLUDE_FILTER = [
  "all",
  ["!=", ROAD_PRIMARY_NAME_EXPRESSION, RUE_CLARENCE_TOKEN],
  ["!=", ROAD_ALT_NAME_EXPRESSION, RUE_CLARENCE_TOKEN]
];
export const GATINEAU_ROAD_NAME_TOKENS = [
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
export const GATINEAU_ROAD_REF_TOKENS = ["5", "50"].map(
  (ref) => toDefaultToken(ref)
);
export const GATINEAU_ROAD_TOKEN_SET = /* @__PURE__ */ new Set([
  ...GATINEAU_ROAD_NAME_TOKENS,
  ...GATINEAU_ROAD_REF_TOKENS
]);
export const GATINEAU_EXEMPT_NAME_TOKENS = [
  "Macdonald-Cartier Bridge",
  "Pont Macdonald-Cartier Bridge",
  "Coventry Road",
  "Coventry Rd",
  "Ogilvie Road",
  "Ogilvie Rd"
].map((name) => toDefaultToken(name));
export const GATINEAU_EXEMPT_NAME_FILTER = [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_EXEMPT_NAME_TOKENS]]
  )
];
export const GATINEAU_ROAD_NAME_FILTER = [
  "any",
  ...ROAD_NAME_EXPRESSIONS.map(
    (expr) => ["in", expr, ["literal", GATINEAU_ROAD_NAME_TOKENS]]
  )
];
export const GATINEAU_ROAD_REF_VALUE_EXPRESSION = [
  "concat",
  ";",
  ROAD_REF_EXPRESSION,
  ";"
];
export const GATINEAU_ROAD_REF_FILTER = [
  "all",
  [
    "any",
    ...GATINEAU_ROAD_REF_TOKENS.map(
      (ref) => ["in", `;${ref};`, GATINEAU_ROAD_REF_VALUE_EXPRESSION]
    )
  ],
  ["!", GATINEAU_EXEMPT_NAME_FILTER]
];
export const GATINEAU_ROADS_EXCLUDE_FILTER = [
  "!",
  [
    "any",
    GATINEAU_ROAD_NAME_FILTER,
    GATINEAU_ROAD_REF_FILTER
  ]
];
export const ROAD_LABEL_TEXT_EXPRESSION = [
  "coalesce",
  ["get", "name"],
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "ref"],
  ""
];
export const ROAD_LABEL_TEXT_EXPRESSION_EN_FIRST = [
  "coalesce",
  ["get", "name:en"],
  ["get", "name_en"],
  ["get", "name"],
  ["get", "ref"],
  ""
];
export const buildOttawaLabelTextExpression = (useChaudiereOverride) => {
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
export const buildMontrealLabelTextExpression = () => {
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
export const buildRoadLabelTextExpression = (city, options) => {
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
export const MIN_NAME_SUBSTRING_LENGTH = 3;
export const MIN_REF_SUBSTRING_LENGTH = 1;
export const ALWAYS_FALSE_EXPRESSION = ["literal", false];
export const TOKEN_PARTS_SPLIT_REGEX = /[^a-z0-9]+/i;
export const NUMERIC_PART_REGEX = /^\d+$/;
export const MAJOR_HIGHWAY_TYPES = [
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
export const MAJOR_HIGHWAY_FILTER = [
  "in",
  ["get", "highway"],
  ["literal", MAJOR_HIGHWAY_TYPES]
];
export const DIRECTIONAL_SUFFIX_PARTS = /* @__PURE__ */ new Set([
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
export const normalizeRoadToken = (value) => value.trim().toLowerCase();
export const foldRoadToken = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const foldTokenForMatch = (value) => foldRoadToken(value.trim().toLowerCase());
export const CHAUDIERE_BRIDGE_TOKEN_FOLDED = foldTokenForMatch(CHAUDIERE_BRIDGE_LABEL);
export const findTokenByFoldedMatch = (tokens, foldedToken) => tokens.find((token) => foldTokenForMatch(token) === foldedToken);
export const findChaudiereBridgeToken = (tokens) => findTokenByFoldedMatch(tokens, CHAUDIERE_BRIDGE_TOKEN_FOLDED);
export const hasChaudiereBridgeToken = (tokens) => Boolean(findChaudiereBridgeToken(tokens));
export const getTokenParts = (token) => {
  const parts = token.split(TOKEN_PARTS_SPLIT_REGEX).filter(Boolean);
  if (!parts.length) return [];
  const filtered = parts.filter(
    (part) => part.length >= 2 || NUMERIC_PART_REGEX.test(part)
  );
  return filtered.length ? filtered : parts;
};
export const getFoldedTokenParts = (token) => getTokenParts(foldRoadToken(token));
export const buildTokenMatchExpression = (token, fieldExpression, minSubstringLength) => {
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
export const isHighwayToken = (token, label) => NUMERIC_PART_REGEX.test(token) || NUMERIC_PART_REGEX.test(label);
export const getNameParts = (value) => getFoldedTokenParts(value);
export const wordMatchesTokenPart = (tokenPart, namePart) => {
  if (!tokenPart || !namePart) return false;
  if (NUMERIC_PART_REGEX.test(tokenPart)) return namePart === tokenPart;
  if (tokenPart.length < MIN_NAME_SUBSTRING_LENGTH) {
    return namePart === tokenPart;
  }
  if (namePart === tokenPart) return true;
  return namePart.endsWith("s") && namePart.slice(0, -1) === tokenPart;
};
export const hasOnlyDirectionalSuffixParts = (tokenParts, nameParts) => {
  if (nameParts.length < tokenParts.length) return false;
  if (nameParts.length === tokenParts.length) return true;
  for (let index = tokenParts.length; index < nameParts.length; index += 1) {
    if (!DIRECTIONAL_SUFFIX_PARTS.has(nameParts[index])) return false;
  }
  return true;
};
export const matchesNameTokenParts = (tokenParts, nameParts) => {
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
export const matchesRefTokenParts = (tokenParts, refParts) => {
  if (!tokenParts.length || !refParts.length) return false;
  if (tokenParts.length === 1) {
    return refParts.includes(tokenParts[0]);
  }
  return tokenParts.every((tokenPart) => refParts.includes(tokenPart));
};
export const splitNamesByPopularity = (names) => {
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
export const isPreferredPopularCandidate = (candidate, current, tokenParts) => {
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
export const selectPreferredPopularMatch = (token, tokenParts, roadIndex) => {
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
export const buildStrictNameFilter = (names, highwayFilter) => {
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
export const buildRefMatchFilter = (refs, includeHighwayFilter) => {
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
export const buildRoadIndex = (catalog) => {
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
export const tokenMatchCache = /* @__PURE__ */ new WeakMap();
export const getTokenMatch = (roadIndex, token) => {
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
export const buildRoadMatchIndex = (roadIndex, roadTokens, labelOverrides) => {
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
export const getRoadFilterOverrides = (city, roadTokens) => {
  if (city !== "ottawa") return [];
  if (!hasChaudiereBridgeToken(roadTokens)) return [];
  return [CHAUDIERE_BRIDGE_OVERRIDE_FILTER];
};
export const getHighwayRefTokens = (city) => city === "ottawa" ? OTTAWA_HIGHWAY_REF_TOKENS : null;
export const getRoadGlobalFilters = (city, includeGatineauRoads) => {
  if (city !== "ottawa") return [];
  const filters = [RUE_CLARENCE_EXCLUDE_FILTER];
  if (!includeGatineauRoads) {
    filters.push(GATINEAU_ROADS_EXCLUDE_FILTER);
  }
  return filters;
};
export const shouldUseChaudiereBridgeOverride = (city, roadTokens) => city === "ottawa" && hasChaudiereBridgeToken(roadTokens);
export const buildRoadFilter = (roadTokens, matchIndex, extraFilters = [], globalFilters = [], options) => {
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
export const buildRoadColorExpression = (roadTokens, matchIndex, fallbackColor = DEFAULT_ROAD_COLOR, colorOverrides) => {
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
export const buildRoadOpacityExpression = (roadTokens, matchIndex, fallbackOpacity = 1) => {
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
