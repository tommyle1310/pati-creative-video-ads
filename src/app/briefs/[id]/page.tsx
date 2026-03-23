"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ScriptPhase {
  phase: string;
  duration: string;
  direction: string;
  textSupers?: string[];
}

interface ReferenceAd {
  brand: string;
  whatToSteal: string;
  whatToImprove: string;
}

interface BriefJson {
  briefTitle?: string;
  winningPatternSummary?: string;
  recommendedFormat?: string;
  targetAudience?: string;
  hookApproach?: {
    hookType?: string;
    hooks?: string[];
  };
  messagingAngle?: string;
  offerStructure?: string;
  scriptOutline?: {
    phases?: ScriptPhase[];
  };
  differentiators?: string[];
  referenceAds?: ReferenceAd[];
  productionNotes?: string;
  rawText?: string;
}

interface BriefData {
  id: string;
  targetProduct: string;
  targetMarket: string;
  basedOnAdIds: string[];
  briefJson: BriefJson;
  userContext: string | null;
  notes: string | null;
  createdAt: string;
}

export default function BriefDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/briefs/${id}`);
        if (!res.ok) { router.push("/briefs"); return; }
        const data = await res.json();
        setBrief(data.brief);
        setNotesText(data.brief.notes || "");
      } catch { router.push("/briefs"); }
      setLoading(false);
    })();
  }, [id, router]);

  const copyAsMarkdown = () => {
    if (!brief) return;
    const b = brief.briefJson;
    let md = `# ${b.briefTitle || "Creative Brief"}\n\n`;
    md += `**Product:** ${brief.targetProduct} | **Market:** ${brief.targetMarket}\n\n`;
    if (b.winningPatternSummary) md += `## Winning Pattern\n${b.winningPatternSummary}\n\n`;
    if (b.recommendedFormat) md += `**Format:** ${b.recommendedFormat}\n\n`;
    if (b.targetAudience) md += `**Audience:** ${b.targetAudience}\n\n`;
    if (b.hookApproach?.hooks) {
      md += `## Hook Options (${b.hookApproach.hookType || ""})\n`;
      b.hookApproach.hooks.forEach((h, i) => { md += `${i + 1}. ${h}\n`; });
      md += "\n";
    }
    if (b.messagingAngle) md += `**Messaging Angle:** ${b.messagingAngle}\n\n`;
    if (b.offerStructure) md += `**Offer:** ${b.offerStructure}\n\n`;
    if (b.scriptOutline?.phases) {
      md += `## Script Outline\n`;
      b.scriptOutline.phases.forEach((p) => {
        md += `### ${p.phase} (${p.duration})\n${p.direction}\n`;
        if (p.textSupers?.length) md += `Text supers: ${p.textSupers.join(" | ")}\n`;
        md += "\n";
      });
    }
    if (b.differentiators?.length) {
      md += `## Differentiators\n`;
      b.differentiators.forEach((d) => { md += `- ${d}\n`; });
      md += "\n";
    }
    if (b.productionNotes) md += `## Production Notes\n${b.productionNotes}\n`;

    navigator.clipboard.writeText(md);
  };

  const saveNotes = async () => {
    if (!brief) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText || null }),
      });
      setBrief({ ...brief, notes: notesText || null });
      setEditingNotes(false);
    } catch { /* ignore */ }
    setSavingNotes(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-center py-16 text-muted-foreground">Loading brief...</p>
      </div>
    );
  }
  if (!brief) return null;

  const b = brief.briefJson;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={() => router.push("/briefs")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        All Briefs
      </Button>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default">{brief.targetProduct}</Badge>
          <Badge variant="secondary">{brief.targetMarket}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(brief.createdAt).toLocaleDateString()}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground leading-snug">
          {b.briefTitle || "Creative Brief"}
        </h1>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={copyAsMarkdown}>
            Copy as Markdown
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Export to Google Sheet
          </Button>
        </div>
      </header>

      {/* Winning Pattern */}
      {b.winningPatternSummary && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Winning Pattern
          </h2>
          <Card className="p-5 bg-emerald-500/10 border-emerald-500/20 text-sm leading-relaxed text-foreground">
            {b.winningPatternSummary}
          </Card>
        </section>
      )}

      {/* Format + Audience */}
      {(b.recommendedFormat || b.targetAudience) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
          {b.recommendedFormat && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Recommended Format
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{b.recommendedFormat}</p>
            </Card>
          )}
          {b.targetAudience && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Target Audience
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{b.targetAudience}</p>
            </Card>
          )}
        </div>
      )}

      {/* Hook Options */}
      {b.hookApproach?.hooks && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Hook Options{b.hookApproach.hookType ? ` (${b.hookApproach.hookType})` : ""}
          </h2>
          <div className="flex flex-col gap-2.5">
            {b.hookApproach.hooks.map((hook, i) => (
              <Card key={i} className="flex items-start gap-3 px-4 py-3.5">
                <span className="text-sm font-bold text-amber-500 shrink-0 mt-0.5">#{i + 1}</span>
                <p className="flex-1 text-sm leading-relaxed text-foreground">{hook}</p>
                <button
                  className="shrink-0 px-2.5 py-1 text-xs rounded border border-border bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => navigator.clipboard.writeText(hook)}
                >
                  Copy
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Messaging + Offer */}
      {(b.messagingAngle || b.offerStructure) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
          {b.messagingAngle && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Messaging Angle
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{b.messagingAngle}</p>
            </Card>
          )}
          {b.offerStructure && (
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Offer Structure
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{b.offerStructure}</p>
            </Card>
          )}
        </div>
      )}

      {/* Script Outline */}
      {b.scriptOutline?.phases && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Script Outline
          </h2>
          <div className="flex flex-col gap-2">
            {b.scriptOutline.phases.map((phase, i) => (
              <Card key={i} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-violet-400">
                    {phase.phase}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{phase.duration}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{phase.direction}</p>
                {phase.textSupers && phase.textSupers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {phase.textSupers.map((ts, j) => (
                      <Badge key={j} variant="outline" className="text-amber-500 border-amber-500/30 text-[11px]">
                        {ts}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Differentiators */}
      {b.differentiators && b.differentiators.length > 0 && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Differentiators
          </h2>
          <div className="flex flex-col gap-1.5">
            {b.differentiators.map((d, i) => (
              <Card key={i} className="flex items-start gap-3 px-4 py-3">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed text-foreground">{d}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Reference Ads */}
      {b.referenceAds && b.referenceAds.length > 0 && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Reference Ads
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {b.referenceAds.map((ref, i) => (
              <Card key={i} className="px-4 py-3.5">
                <h4 className="text-sm font-semibold text-foreground mb-2">{ref.brand}</h4>
                <p className="text-xs text-muted-foreground leading-snug mb-1">
                  <span className="font-semibold text-muted-foreground/70">Steal: </span>
                  {ref.whatToSteal}
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  <span className="font-semibold text-muted-foreground/70">Improve: </span>
                  {ref.whatToImprove}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Production Notes */}
      {b.productionNotes && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Production Notes
          </h2>
          <Card className="p-5 bg-violet-500/10 border-violet-500/20 text-sm leading-relaxed text-foreground">
            {b.productionNotes}
          </Card>
        </section>
      )}

      {/* Raw text fallback */}
      {b.rawText && !b.briefTitle && (
        <section className="mb-7">
          <h2 className="text-base font-semibold text-foreground pb-2 mb-3 border-b border-border">
            Generated Brief
          </h2>
          <Card className="p-4">
            <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
              {b.rawText}
            </pre>
          </Card>
        </section>
      )}

      {/* Notes */}
      <section className="mb-7">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Notes</h2>
          {editingNotes ? (
            <Button variant="outline" size="sm" onClick={saveNotes} disabled={savingNotes} className="flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {savingNotes ? "Saving..." : "Save"}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)} className="flex items-center gap-1.5 text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add notes about this brief..."
            rows={4}
            className="w-full px-3 py-2.5 bg-white/5 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-y font-[inherit]"
            autoFocus
          />
        ) : brief.notes ? (
          <Card className="p-4">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{brief.notes}</p>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet. Click Edit to add notes.</p>
        )}
      </section>
    </div>
  );
}
