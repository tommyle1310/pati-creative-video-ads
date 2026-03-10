/**
 * lib/apis/foreplay-manager.ts — Project Antigravity
 * Foreplay connection manager: API primary + scraper fallback
 */
import { execSync } from 'child_process';
import path from 'path';

let useScraper = false;
let scraperCookies: Record<string, string> | null = null;

const FP_BASE = 'https://api.foreplay.co/v1';

function getFpHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.FOREPLAY_API_KEY || ''}`,
    'Content-Type': 'application/json',
  };
}

export async function testForeplayConnection(): Promise<boolean> {
  const key = process.env.FOREPLAY_API_KEY;
  if (!key) return false;

  try {
    const res = await fetch(`${FP_BASE}/me`, {
      headers: getFpHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) {
      console.warn('Foreplay API key invalid or quota exceeded — switching to scraper fallback');
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

async function getForeplayScraperCookies(): Promise<Record<string, string>> {
  try {
    const scriptPath = path.join(process.cwd(), 'tools', 'foreplay_scraper.py');
    const result = execSync(`python -c "
import sys; sys.path.insert(0, '${path.dirname(scriptPath).replace(/\\/g, '\\\\')}')
from foreplay_scraper import get_session_cookies_sync
import json
cookies = get_session_cookies_sync()
print(json.dumps(cookies))
"`, { timeout: 30000, encoding: 'utf-8' });
    return JSON.parse(result.trim());
  } catch (e) {
    console.error('Failed to get scraper cookies:', e);
    return {};
  }
}

export async function initForeplayConnection(): Promise<void> {
  const apiWorking = await testForeplayConnection();
  if (!apiWorking) {
    console.log('Foreplay API unavailable → initialising scraper session');
    useScraper = true;
    scraperCookies = await getForeplayScraperCookies();
  }
}

export async function getForeplayAdDetails(shareUrl: string): Promise<{
  videoUrl: string;
  landingPageUrl: string;
}> {
  if (useScraper && scraperCookies) {
    // Use Python scraper via subprocess
    try {
      const scriptDir = path.join(process.cwd(), 'tools').replace(/\\/g, '\\\\');
      const result = execSync(`python -c "
import sys, json; sys.path.insert(0, '${scriptDir}')
from foreplay_scraper import scrape_share_url_sync
cookies = ${JSON.stringify(scraperCookies)}
result = scrape_share_url_sync('${shareUrl}', cookies)
print(json.dumps(result))
"`, { timeout: 45000, encoding: 'utf-8' });
      return JSON.parse(result.trim());
    } catch (e) {
      console.error('Scraper failed:', e);
      return { videoUrl: '', landingPageUrl: '' };
    }
  }

  // API path
  try {
    // Extract ad ID from share URL
    const match = shareUrl.match(/\/ads\/([a-zA-Z0-9]+)/);
    if (!match) return { videoUrl: '', landingPageUrl: '' };

    const res = await fetch(`${FP_BASE}/ads/${match[1]}`, {
      headers: getFpHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        videoUrl: data.videoUrl || '',
        landingPageUrl: data.landingPageUrl || '',
      };
    }
    return { videoUrl: '', landingPageUrl: '' };
  } catch {
    return { videoUrl: '', landingPageUrl: '' };
  }
}

export function getConnectionStatus(): { method: string; hasCookies: boolean } {
  return {
    method: useScraper ? 'scraper' : 'api',
    hasCookies: useScraper ? !!scraperCookies && Object.keys(scraperCookies).length > 0 : false,
  };
}
