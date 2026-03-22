import type { StudioState, Action } from "./types";
import { initialState } from "./initial";

export function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_SOURCE_DB":
      return {
        ...state,
        sourceType: "db",
        selectedAdId: action.adId,
        selectedAdVideoUrl: action.videoUrl,
        selectedAdBrand: action.brand,
        uploadedVideoUrl: null,
      };
    case "SET_SOURCE_UPLOAD":
      return {
        ...state,
        sourceType: "upload",
        uploadedVideoUrl: action.url,
        uploadedVideoFile: action.file,
        selectedAdId: null,
        selectedAdVideoUrl: null,
        selectedAdBrand: null,
      };
    case "SET_FRAMES":
      return { ...state, frames: action.frames };
    case "SET_ANALYSIS":
      return { ...state, analysis: action.analysis, analyzeError: null };
    case "SET_ANALYZING":
      return {
        ...state,
        isAnalyzing: action.v,
        ...(action.v ? { analyzeError: null } : {}),
      };
    case "SET_ANALYZE_ERROR":
      return { ...state, analyzeError: action.error, isAnalyzing: false };
    case "SET_PRODUCT_IMAGE":
      return { ...state, productImage: action.data, productVidtoryUrl: null };
    case "SET_CREATOR_IMAGE":
      return { ...state, creatorImage: action.data, creatorVidtoryUrl: null };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SCRIPT_SCENES":
      return { ...state, scriptScenes: action.scriptScenes };
    case "UPDATE_SCRIPT_SCENE":
      return {
        ...state,
        scriptScenes: state.scriptScenes.map((sc, i) =>
          i === action.index ? { ...sc, ...action.patch } : sc
        ),
      };
    case "SET_GENERATING_SCRIPT":
      return {
        ...state,
        isGeneratingScript: action.v,
        ...(action.v ? { scriptError: null } : {}),
      };
    case "SET_SCRIPT_ERROR":
      return { ...state, scriptError: action.error, isGeneratingScript: false };
    case "SET_SCENES":
      return { ...state, scenes: action.scenes };
    case "SET_GENERATING_STORYBOARD":
      return {
        ...state,
        isGeneratingStoryboard: action.v,
        ...(action.v ? { storyboardError: null } : {}),
      };
    case "SET_STORYBOARD_ERROR":
      return { ...state, storyboardError: action.error, isGeneratingStoryboard: false };
    case "UPDATE_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s
        ),
      };
    case "SET_VIDTORY_URLS":
      return {
        ...state,
        productVidtoryUrl: action.product ?? state.productVidtoryUrl,
        creatorVidtoryUrl: action.creator ?? state.creatorVidtoryUrl,
      };
    case "LOAD_PROJECT":
      return { ...initialState, ...action.state };
    case "CLEAR_SOURCE":
      return {
        ...state,
        sourceType: null,
        selectedAdId: null,
        selectedAdVideoUrl: null,
        selectedAdBrand: null,
        uploadedVideoUrl: null,
        uploadedVideoFile: null,
      };
    case "RESET_PROGRESS":
      return {
        ...state,
        step: 1,
        frames: [],
        analysis: null,
        isAnalyzing: false,
        analyzeError: null,
        scriptScenes: [],
        isGeneratingScript: false,
        scriptError: null,
        scenes: [],
        isGeneratingStoryboard: false,
        storyboardError: null,
        productVidtoryUrl: null,
        creatorVidtoryUrl: null,
      };
    case "SET_PROJECT_META":
      return {
        ...state,
        currentProjectId: action.id,
        currentProjectName: action.name,
      };
    default:
      return state;
  }
}
