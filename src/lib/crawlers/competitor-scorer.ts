/**
 * lib/crawlers/competitor-scorer.ts — Project Antigravity
 * TypeScript competitor scoring — delegates to Python tool
 */
import { execSync } from 'child_process';
import path from 'path';

export interface CompetitorScoreResult {
  brand: string;
  region: string;
  adCountScore: number;
  longevityScore: number;
  omnichannelScore: number;
  marketFitScore: number;
  compositeScore: number;
  activeAdCount: number;
  oldestAdDays: number;
  platforms: string[];
  marketsServed: string[];
  pageId: string;
}

export async function scoreCompetitorsForRegion(
  keyword: string,
  region: string,
  topN: number = 5,
): Promise<CompetitorScoreResult[]> {
  // Delegate to Python tool for actual API interaction
  try {
    const toolsDir = path.join(process.cwd(), 'tools').replace(/\\/g, '\\\\');
    const result = execSync(`python -c "
import sys, json; sys.path.insert(0, '${toolsDir}')
from competitor_scorer import score_competitors_for_region
scores = score_competitors_for_region('${keyword}', '${region}', ${topN})
print(json.dumps(scores))
"`, { timeout: 120000, encoding: 'utf-8' });
    return JSON.parse(result.trim());
  } catch (e) {
    console.error('Competitor scoring failed:', e);
    return [];
  }
}

/**
 * Score a single brand manually (when Meta API data is pre-fetched)
 */
export function computeCompetitorScore(
  adCountScore: number,
  longevityScore: number,
  omnichannelScore: number,
  marketFitScore: number,
): number {
  return (
    adCountScore * 0.30 +
    longevityScore * 0.35 +
    omnichannelScore * 0.20 +
    marketFitScore * 0.15
  );
}
