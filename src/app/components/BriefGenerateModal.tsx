"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PRODUCTS = ["FusiForce", "MenoMate", "FloraFresh", "Shilajit"];
const MARKETS = ["US", "UK", "AU"];

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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adIds,
          targetProduct: product,
          targetMarket: market,
          additionalContext: context || undefined,
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
      <DialogContent className="w-[min(460px,90vw)]">
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
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-border rounded-md text-sm text-foreground outline-none focus:border-primary"
            >
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </div>

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
