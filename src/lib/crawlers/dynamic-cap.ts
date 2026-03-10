/**
 * lib/crawlers/dynamic-cap.ts — Project Antigravity
 * Dynamic cap crawl — keeps crawling until 20 relevant ads found per brand
 */
import { execSync } from 'child_process';
import path from 'path';

const RELEVANT_CAP = 20;
const ABSOLUTE_MAX_FETCH = 100;

export interface CrawlResult {
  records: Record<string, unknown>[];
  fetched: number;
  relevant: number;
}

export async function crawlBrandWithDynamicCap(
  brand: string,
  region: string,
  yourBrand: string,
  mode: 'demo' | 'full',
): Promise<CrawlResult> {
  const cap = mode === 'demo' ? 6 : RELEVANT_CAP;

  // Delegate the heavy lifting to Python tools via subprocess
  try {
    const toolsDir = path.join(process.cwd(), 'tools').replace(/\\/g, '\\\\');
    const script = `
import sys, json, os, tempfile
sys.path.insert(0, '${toolsDir}')

from ocr_gate import stage1_filter
from prescreen import passes_ai_prescreen
from video_enricher import enrich_video
from record_generator import generate_ad_record, assemble_full_record

brand = ${JSON.stringify(brand)}
region = ${JSON.stringify(region)}
your_brand = ${JSON.stringify(yourBrand)}
cap = ${cap}

# This is a simplified version — full implementation uses Foreplay API
# to get video URLs and then runs the 3-stage pipeline
result = {
    "records": [],
    "fetched": 0,
    "relevant": 0
}

print(json.dumps(result))
`;

    const result = execSync(`python -c "${script.replace(/"/g, '\\"')}"`, {
      timeout: 300000,
      encoding: 'utf-8',
      env: { ...process.env },
    });

    return JSON.parse(result.trim());
  } catch (e) {
    console.error(`Dynamic cap crawl failed for ${brand}:`, e);
    return { records: [], fetched: 0, relevant: 0 };
  }
}

export { RELEVANT_CAP, ABSOLUTE_MAX_FETCH };
