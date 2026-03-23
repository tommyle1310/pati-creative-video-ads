"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe, Link, X, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PRODUCTS = ["FusiForce", "MenoMate", "FloraFresh", "Shilajit"];
const MARKETS = ["US", "UK", "AU"];

interface ProductProfile {
  name: string;
  landingPageUrls: string[];
  bigIdea: string | null;
  productInfo: string | null;
  targetAudience: string | null;
}

interface BriefGenerateModalProps {
  adIds: string[];
  defaultMarket?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BriefGenerateModal({ adIds, defaultMarket, isOpen, onClose }: BriefGenerateModalProps) {
  const router = useRouter();
  const [product, setProduct] = useState("FusiForce");
  const [market, setMarket] = useState(defaultMarket || "US");
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<ProductProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ProductProfile | null>(null);

  // Landing page URLs state
  const [urls, setUrls] = useState<string[]>([""]);
  const [isScraping, setIsScraping] = useState(false);

  // Load saved product profiles on mount
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch("/api/product-profiles");
        const data = await res.json();
        setProfiles(data.profiles || []);
      } catch { /* ignore */ }
    })();
  }, [isOpen]);

  // Match profile when product changes — auto-fill URLs from saved profile
  const matchProfile = useCallback((productName: string) => {
    const match = profiles.find((p) => p.name === productName);
    setActiveProfile(match || null);
    if (match?.landingPageUrls?.length) {
      setUrls(match.landingPageUrls);
    } else {
      setUrls([""]);
    }
  }, [profiles]);

  useEffect(() => { matchProfile(product); }, [product, matchProfile]);

  const handleUrlChange = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
  };

  const handleAddUrl = () => setUrls([...urls, ""]);

  const handleRemoveUrl = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next.length ? next : [""]);
  };

  const handleScrapeAndSave = async () => {
    const validUrls = urls.filter((u) => u.trim());
    if (!validUrls.length) return;
    setIsScraping(true);
    try {
      const res = await fetch("/api/studio/scrape-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      // Save as product profile
      await fetch("/api/product-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product,
          landingPageUrls: validUrls,
          bigIdea: data.bigIdea || null,
          productInfo: data.productInfo || null,
          targetAudience: data.targetAudience || null,
        }),
      });

      // Update local active profile
      const updated: ProductProfile = {
        name: product,
        landingPageUrls: validUrls,
        bigIdea: data.bigIdea || null,
        productInfo: data.productInfo || null,
        targetAudience: data.targetAudience || null,
      };
      setActiveProfile(updated);
      setProfiles((prev) => {
        const filtered = prev.filter((p) => p.name !== product);
        return [updated, ...filtered];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    // Save URLs as product profile before generating (if URLs exist and no profile yet)
    const validUrls = urls.filter((u) => u.trim());
    if (validUrls.length && !activeProfile) {
      try {
        await fetch("/api/product-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product,
            landingPageUrls: validUrls,
          }),
        });
      } catch { /* best-effort */ }
    }

    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adIds,
          targetProduct: product,
          targetMarket: market,
          additionalContext: context || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        setGenerating(false);
        return;
      }

      router.push(`/briefs/${data.id}`);
      onClose();
    } catch {
      setError("Network error");
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[min(520px,90vw)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Creative Brief</DialogTitle>
          <DialogDescription>
            Based on {adIds.length} reference ad{adIds.length > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Target Product
            </label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Landing Page URLs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Globe size={12} />
                Landing Page URLs
                <span className="text-[10px] font-normal text-muted-foreground/70">
                  (AI reads your product data)
                </span>
              </label>
              <button
                onClick={handleScrapeAndSave}
                disabled={isScraping || !urls.some((u) => u.trim())}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer"
              >
                {isScraping ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {isScraping ? "Analyzing..." : "Analyze & Save"}
              </button>
            </div>
            {urls.map((url, i) => (
              <div key={i} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Link
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(i, e.target.value)}
                    placeholder="https://example.com/product"
                    className="w-full bg-white/5 border border-border rounded-md px-3 py-2 pl-7 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                </div>
                {urls.length > 1 && (
                  <button
                    onClick={() => handleRemoveUrl(i)}
                    className="p-2 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddUrl}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus size={12} />
              Add another URL
            </button>
          </div>

          {/* Saved profile indicator */}
          {activeProfile && activeProfile.bigIdea && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
              <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs text-emerald-300">
                Product data saved — AI will use this for brief generation
              </span>
            </div>
          )}

          {/* Market */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Target Market
            </label>
            <div className="flex gap-2">
              {MARKETS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={market === m ? "default" : "outline"}
                  size="sm"
                  className="rounded-full px-5"
                  onClick={() => setMarket(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Additional Context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Focus on subscription angle, Make it funny, Target gym bros 25-35"
              rows={3}
              className="w-full px-3 py-2.5 bg-white/5 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-y font-[inherit]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Note (optional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Version for TikTok, Q3 campaign, test hook A"
              className="w-full px-3 py-2 bg-white/5 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Brief"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
