"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BriefItem {
  id: string;
  targetProduct: string;
  targetMarket: string;
  basedOnAdIds: string[];
  briefJson: { briefTitle?: string };
  createdAt: string;
}

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<BriefItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/briefs");
        const data = await res.json();
        setBriefs(data.briefs || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Creative Briefs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated creative briefs based on winning competitor ads
        </p>
      </header>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading briefs...</div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No briefs generated yet. Click &quot;Generate Brief&quot; on any ad to create one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {briefs.map((b) => (
            <Card
              key={b.id}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:border-border/80 transition-colors"
              onClick={() => router.push(`/briefs/${b.id}`)}
            >
              <Badge variant="default" className="shrink-0">
                {b.targetProduct}
              </Badge>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {b.briefJson?.briefTitle || "Untitled Brief"}
                </h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{b.targetMarket} market</span>
                  <span>Based on {b.basedOnAdIds.length} ad{b.basedOnAdIds.length > 1 ? "s" : ""}</span>
                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
