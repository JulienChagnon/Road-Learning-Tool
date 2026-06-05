import { OTTAWA_REF_LABEL_EXCLUSIONS } from "./config.js";
import {
  normalizeRoadToken,
  getNameParts,
  getTokenParts,
  matchesNameTokenParts,
  matchesRefTokenParts
} from "./roads.js";

export const shuffleTokens = (tokens) => {
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
export const getQuizEmptyMessage = (correctCount, guessCount) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No selected roads visible. Pan or zoom for another prompt.";
};
export const getBuildingQuizEmptyMessage = (correctCount, guessCount) => {
  if (guessCount > 0) {
    return `Final score: ${correctCount}/${guessCount}.`;
  }
  return "No campus buildings visible. Zoom in for another prompt.";
};
export const NAME_SEPARATOR_REGEX = /\s*(?:\/|&|\+)\s*/i;
export const getFeatureNameCandidates = (value) => {
  const normalized = normalizeRoadToken(value);
  if (!normalized) return [];
  const candidates = /* @__PURE__ */ new Set([normalized]);
  const splitNames = normalized.split(NAME_SEPARATOR_REGEX).map((entry) => entry.trim()).filter(Boolean);
  splitNames.forEach((entry) => candidates.add(entry));
  return Array.from(candidates);
};
export const featureMatchesToken = (feature, tokenParts, token) => {
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
export const getQuizFeatureTokens = (features, matchIndex) => {
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
