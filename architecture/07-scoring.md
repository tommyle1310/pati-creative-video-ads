# SOP 07 — Ad Scoring

## Goal
Compute AdScore (0–10) for ranking ads in Excel output.

## Formula
```
AdScore = (LongevityScore × 0.50) + (ImpressionsScore × 0.30) + (DurationScore × 0.20)
```

### LongevityScore
```
min(longevityDays / 90, 1.0) × 10
```
- 90+ days = 10/10 (ROI-positive signal)
- 45 days = 5/10

### ImpressionsScore
```
log10(impressions_upper_bound) / log10(10_000_000) × 10
```
- 10M impressions = 10/10
- 100K = ~5/10
- Uses log scale for fair distribution

### DurationScore
```
min(durationSeconds / 120, 1.0) × 10
```
- 120s+ = 10/10 (long-form commitment signal)
- 30s = 2.5/10

## Edge Cases
- Missing impressions data → use median (500K) as fallback
- Missing duration → set to 30s default
- Score must be computed BEFORE Excel export
