"use client";

import { useCallback } from "react";
import { useStudio } from "../_state/context";

export function useLandingPageScrape() {
  const { s, dispatch } = useStudio();

  const handleAddUrl = useCallback(() => {
    dispatch({
      type: "SET_FIELD",
      field: "landingPageUrls",
      value: [...s.landingPageUrls, ""],
    });
  }, [s.landingPageUrls, dispatch]);

  const handleRemoveUrl = useCallback(
    (index: number) => {
      const next = s.landingPageUrls.filter((_, i) => i !== index);
      dispatch({
        type: "SET_FIELD",
        field: "landingPageUrls",
        value: next.length ? next : [""],
      });
    },
    [s.landingPageUrls, dispatch]
  );

  const handleUrlChange = useCallback(
    (index: number, value: string) => {
      const next = [...s.landingPageUrls];
      next[index] = value;
      dispatch({ type: "SET_FIELD", field: "landingPageUrls", value: next });
    },
    [s.landingPageUrls, dispatch]
  );

  const handleScrapeLandingPages = useCallback(async () => {
    const urls = s.landingPageUrls.filter((u) => u.trim());
    if (!urls.length) return;
    dispatch({ type: "SET_FIELD", field: "isScrapingUrls", value: true });
    try {
      const res = await fetch("/api/studio/scrape-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.bigIdea)
        dispatch({ type: "SET_FIELD", field: "bigIdea", value: data.bigIdea });
      if (data.productInfo)
        dispatch({
          type: "SET_FIELD",
          field: "productInfo",
          value: data.productInfo,
        });
      if (data.targetAudience)
        dispatch({
          type: "SET_FIELD",
          field: "targetAudience",
          value: data.targetAudience,
        });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      dispatch({ type: "SET_FIELD", field: "isScrapingUrls", value: false });
    }
  }, [s.landingPageUrls, dispatch]);

  return {
    handleAddUrl,
    handleRemoveUrl,
    handleUrlChange,
    handleScrapeLandingPages,
  };
}
