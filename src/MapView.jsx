import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import maplibregl from "maplibre-gl";
import {
  DEFAULT_CITY,
  CITY_CONFIG,
  getRasterScale,
  buildRasterStyle,
  getRoadCatalogUrl,
  getQuizResultDuration,
  getKingstonCampusZoom,
  KINGSTON_CAMPUS_CENTER,
  ROAD_TILE_MIN_ZOOM,
  ROAD_SOURCE_ID,
  ROAD_LAYER_ID,
  ROAD_LABEL_LAYER_ID,
  BUILDING_SOURCE_ID,
  BUILDING_FILL_LAYER_ID,
  BUILDING_OUTLINE_LAYER_ID,
  BUILDING_LABEL_LAYER_ID,
  BUILDING_LABEL_SOURCE_ID,
  KINGSTON_FIELD_LABEL_LAYER_ID,
  MONTREAL_REF_LABEL_OVERRIDES,
  OTTAWA_REF_LABEL_OVERRIDES,
  KINGSTON_NAME_LABEL_OVERRIDES,
  OTTAWA_ALIAS_TOKEN_BY_VALUE
} from "./map/config.js";
import {
  getRoutePathname,
  getCityFromPathname,
  getQuizFromPathname,
  getBuildingQuizFromPathname,
  getBasePathname,
  CITY_PATH_SEGMENTS,
  BUILDINGS_PATH_SEGMENT,
  QUIZ_PATH_SEGMENT,
  normalizePathname,
  ROUTE_HASH_PREFIX
} from "./map/routing.js";
import {
  QUIZ_BASE_ROAD_COLOR,
  QUIZ_CORRECT_ROAD_COLOR,
  QUIZ_INCORRECT_ROAD_COLOR,
  BUILDING_QUIZ_ROAD_COLOR,
  ROAD_LABEL_SIZE_EXPRESSION,
  BUILDING_QUIZ_ROAD_LABEL_SIZE_EXPRESSION,
  buildContrastingTextColorExpression,
  buildBuildingQuizColorExpression
} from "./map/colors.js";
import {
  GATINEAU_ROAD_TOKEN_SET,
  buildRoadIndex,
  buildRoadMatchIndex,
  isHighwayToken,
  normalizeRoadToken,
  getFoldedTokenParts,
  buildRoadColorExpression,
  buildRoadOpacityExpression,
  buildRoadFilter,
  buildRoadLabelTextExpression,
  getRoadFilterOverrides,
  getRoadGlobalFilters,
  getHighwayRefTokens,
  shouldUseChaudiereBridgeOverride
} from "./map/roads.js";
import {
  shuffleTokens,
  getQuizEmptyMessage,
  getBuildingQuizEmptyMessage,
  getQuizFeatureTokens,
  featureMatchesToken
} from "./map/quiz.js";
import {
  KINGSTON_BUILDING_DISPLAY_LABELS,
  buildBuildingLabelFeatureCollection,
  buildingFeatureMatchesLabel,
  BUILDING_LABEL_DISPLAY_EXPRESSION,
  KINGSTON_BUILDING_COLOR_EXPRESSION,
  KINGSTON_BUILDING_QUIZ_BASE_COLOR,
  KINGSTON_BUILDING_ROAD_QUIZ_COLOR,
  KINGSTON_BUILDING_QUIZ_OUTLINE_COLOR,
  KINGSTON_BUILDING_FILL_OPACITY_EXPRESSION,
  KINGSTON_BUILDING_QUIZ_OPACITY_EXPRESSION,
  KINGSTON_BUILDING_ROAD_QUIZ_OPACITY_EXPRESSION,
  KINGSTON_BUILDING_OUTLINE_OPACITY,
  KINGSTON_BUILDING_LABEL_HALO_COLOR
} from "./map/buildings.js";
import {
  ensureRoadLayer,
  ensureBuildingLayer,
  resetRoadSource,
  resetBuildingSource
} from "./map/layers.js";
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
    // Initial* values are only read on the first run; re-running on their
    // change would clobber user state, so they are intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Runs once on mount; initialCity/initialTokens seed the first render only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
