import { DEFAULT_CITY } from "./config.js";

export const QUIZ_PATH_SEGMENT = "quiz";
export const BUILDINGS_PATH_SEGMENT = "buildings";
export const ROUTE_HASH_PREFIX = "#/";
export const CITY_PATH_SEGMENTS = {
  ottawa: "ottawa",
  montreal: "montreal",
  kingston: "queens"
};
export const CITY_PATH_ALIASES = {
  ottawa: ["", "ottawa"],
  montreal: ["montreal"],
  kingston: ["queens", "kingston_queens_university", "kingston"]
};
export const getBasePathname = () => {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
};
export const getRoutePathname = () => {
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
export const normalizePathname = (path) => path.endsWith("/") ? path : `${path}/`;
export const getPathSegments = (pathname) => {
  const basePath = normalizePathname(getBasePathname()).toLowerCase();
  let normalized = normalizePathname(pathname).toLowerCase();
  if (normalized.startsWith(basePath)) {
    normalized = normalized.slice(basePath.length);
  }
  const trimmed = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed ? trimmed.split("/") : [];
};
export const getCityFromPathname = (pathname) => {
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
export const getQuizFromPathname = (pathname) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(QUIZ_PATH_SEGMENT);
};
export const getBuildingQuizFromPathname = (pathname) => {
  const segments = getPathSegments(pathname);
  if (!segments.length) return false;
  return segments.includes(BUILDINGS_PATH_SEGMENT);
};
