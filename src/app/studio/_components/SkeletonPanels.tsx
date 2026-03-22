"use client";

export function AnalysisSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-muted/50 rounded-md p-4 space-y-2">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-48 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted/30 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScriptSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/20 border border-border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-emerald-500/20 rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-16 w-full bg-muted/50 rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-8 w-full bg-muted/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StoryboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/20 border border-border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-emerald-500/20 rounded" />
            <div className="h-4 w-14 bg-blue-500/20 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-16 w-full bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
