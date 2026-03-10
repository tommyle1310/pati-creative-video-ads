/**
 * lib/apis/meta.ts — Project Antigravity
 * TypeScript Meta Ad Library client
 */

const META_API_BASE = 'https://graph.facebook.com/v21.0/ads_archive';

interface MetaAdRaw {
  id: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_titles?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  impressions?: { lower_bound: string; upper_bound: string };
  spend?: { lower_bound: string; upper_bound: string; currency: string };
}

interface MetaSearchResult {
  data: MetaAdRaw[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

const REGION_MAP: Record<string, string> = {
  US: 'US',
  UK: 'GB',
  AU: 'AU',
};

export async function searchMetaAds(
  keyword: string,
  region: string,
  limit: number = 25,
  afterCursor?: string,
): Promise<MetaSearchResult> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not set');

  const country = REGION_MAP[region] || region;
  const params = new URLSearchParams({
    search_terms: keyword,
    ad_type: 'POLITICAL_AND_ISSUE_ADS',
    ad_reached_countries: `["${country}"]`,
    ad_active_status: 'ACTIVE',
    fields: [
      'ad_creative_bodies', 'ad_creative_link_captions', 'ad_creative_link_titles',
      'ad_snapshot_url', 'ad_delivery_start_time', 'page_id', 'page_name',
      'publisher_platforms', 'impressions', 'spend', 'id',
    ].join(','),
    access_token: token,
    limit: Math.min(limit, 25).toString(),
  });

  if (afterCursor) params.set('after', afterCursor);

  const res = await fetch(`${META_API_BASE}?${params}`, { signal: AbortSignal.timeout(30000) });
  if (res.status === 429) {
    console.warn('Meta API 429 — backing off 60s');
    await new Promise(r => setTimeout(r, 60000));
    return searchMetaAds(keyword, region, limit, afterCursor);
  }
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);

  return res.json();
}

export async function testMetaConnection(): Promise<boolean> {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return false;
    const res = await fetch(
      `${META_API_BASE}?search_terms=test&ad_reached_countries=["US"]&ad_active_status=ACTIVE&access_token=${token}&limit=1`,
      { signal: AbortSignal.timeout(10000) },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function calculateLongevityDays(adDeliveryStartTime: string): number {
  try {
    const start = new Date(adDeliveryStartTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export type { MetaAdRaw, MetaSearchResult };
