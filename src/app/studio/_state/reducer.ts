import type { StudioState, Action } from "./types";
import { initialState } from "./initial";

export function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.step,
        maxStepReached: Math.max(state.maxStepReached, action.step),
      };
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
    case "SET_AUDIO_EXTRACTED":
      return { ...state, audioExtracted: action.v };
    case "SET_PRODUCT_IMAGE": {
      // Set as primary; also add to gallery if not already there
      const pImgs = action.data && !state.productImages.includes(action.data)
        ? [...state.productImages, action.data]
        : state.productImages;
      return { ...state, productImage: action.data, productImages: pImgs, productVidtoryUrl: null };
    }
    case "ADD_PRODUCT_IMAGES": {
      const newPImgs = [...state.productImages, ...action.images];
      return {
        ...state,
        productImages: newPImgs,
        productImage: state.productImage || newPImgs[0] || null,
        productVidtoryUrl: null,
      };
    }
    case "REMOVE_PRODUCT_IMAGE": {
      const filtered = state.productImages.filter((_, i) => i !== action.index);
      const removedWasPrimary = state.productImage === state.productImages[action.index];
      return {
        ...state,
        productImages: filtered,
        productImage: removedWasPrimary ? (filtered[0] || null) : state.productImage,
        productVidtoryUrl: null,
      };
    }
    case "SET_CREATOR_IMAGE": {
      const cImgs = action.data && !state.creatorImages.includes(action.data)
        ? [...state.creatorImages, action.data]
        : state.creatorImages;
      return { ...state, creatorImage: action.data, creatorImages: cImgs, creatorVidtoryUrl: null };
    }
    case "ADD_CREATOR_IMAGES": {
      const newCImgs = [...state.creatorImages, ...action.images];
      return {
        ...state,
        creatorImages: newCImgs,
        creatorImage: state.creatorImage || newCImgs[0] || null,
        creatorVidtoryUrl: null,
      };
    }
    case "REMOVE_CREATOR_IMAGE": {
      const cFiltered = state.creatorImages.filter((_, i) => i !== action.index);
      const cRemovedWasPrimary = state.creatorImage === state.creatorImages[action.index];
      return {
        ...state,
        creatorImages: cFiltered,
        creatorImage: cRemovedWasPrimary ? (cFiltered[0] || null) : state.creatorImage,
        creatorVidtoryUrl: null,
      };
    }
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
    case "LOAD_PROJECT": {
      // Filter out undefined values so initialState defaults aren't overwritten
      const cleaned = Object.fromEntries(
        Object.entries(action.state).filter(([, v]) => v !== undefined)
      );
      const loaded = { ...initialState, ...cleaned };
      return {
        ...loaded,
        maxStepReached: Math.max(loaded.maxStepReached, loaded.step),
      };
    }
    case "CLEAR_SOURCE":
      return {
        ...state,
        sourceType: null,
        selectedAdId: null,
        selectedAdVideoUrl: null,
        selectedAdBrand: null,
        uploadedVideoUrl: null,
        uploadedVideoFile: null,
        providedScript: "",
      };
    case "RESET_PROGRESS":
      return {
        ...state,
        step: 1,
        maxStepReached: 1,
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
    case "SET_AUTO_PHASE":
      return {
        ...state,
        autoPhase: action.phase,
        autoDetail: action.detail ?? state.autoDetail,
        autoError: action.error !== undefined ? action.error : state.autoError,
      };
    default:
      return state;
  }
}
