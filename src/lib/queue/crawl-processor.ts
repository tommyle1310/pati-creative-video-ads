/**
 * lib/queue/crawl-processor.ts — Project Antigravity
 * BullMQ worker orchestrating the full pipeline
 */
import { Queue, Worker, type Job } from 'bullmq';
import { execSync } from 'child_process';
import path from 'path';
import type Redis from 'ioredis';

// Types
interface CrawlJobData {
  markets: string[];
  keyword: string;
  yourBrand: string;
  mode: 'demo' | 'full';
}

interface CrawlJobResult {
  adsAnalysed: number;
  excelPath: string;
  markets: string[];
  mode: string;
  totalCostEstimate: string;
}

// Queue setup (lazy init — only when Redis is available)
let crawlQueue: Queue | null = null;
let crawlWorker: Worker | null = null;

export function initQueue(redisConnection: Redis): { queue: Queue; worker: Worker } {
  crawlQueue = new Queue('crawl-queue', { connection: redisConnection as never });

  crawlWorker = new Worker(
    'crawl-queue',
    async (job: Job<CrawlJobData>) => {
      const { markets, keyword, yourBrand, mode } = job.data;
      const allRecords: Record<string, unknown>[] = [];

      for (const region of markets) {
        // PHASE 1: Score competitors
        await job.updateProgress({ phase: 'scoring', region });
        // Calls Python tool
        const toolsDir = path.join(process.cwd(), 'tools').replace(/\\/g, '\\\\');

        try {
          const scoresJson = execSync(
            `python -c "import sys,json;sys.path.insert(0,'${toolsDir}');from competitor_scorer import score_competitors_for_region;print(json.dumps(score_competitors_for_region('${keyword}','${region}',5)))"`,
            { timeout: 120000, encoding: 'utf-8' },
          );
          const competitors = JSON.parse(scoresJson.trim());

          // PHASE 2: Crawl each competitor
          for (const competitor of competitors) {
            await job.updateProgress({
              phase: 'crawling',
              region,
              brand: competitor.brand,
            });
            // Dynamic cap crawl would happen here
            // For now, record the competitor
            console.log(`Crawling ${competitor.brand} in ${region}...`);
          }
        } catch (e) {
          console.error(`Scoring failed for ${region}:`, e);
        }
      }

      // PHASE 3: Build Excel
      await job.updateProgress({ phase: 'building_excel' });
      const excelPath = path.join(process.cwd(), '.tmp', `antigravity-export-${job.id}.xlsx`);

      try {
        const recordsJson = JSON.stringify(allRecords).replace(/'/g, "\\'");
        execSync(
          `python -c "import sys,json;sys.path.insert(0,'${path.join(process.cwd(), 'tools').replace(/\\/g, '\\\\')}');from excel_builder import build_excel;build_excel(json.loads('${recordsJson}'),'${excelPath.replace(/\\/g, '\\\\')}')"`,
          { timeout: 60000, encoding: 'utf-8' },
        );
      } catch (e) {
        console.error('Excel build failed:', e);
      }

      return {
        adsAnalysed: allRecords.length,
        excelPath,
        markets,
        mode,
        totalCostEstimate: `$${(allRecords.length * 0.032).toFixed(2)}`,
      } satisfies CrawlJobResult;
    },
    {
      connection: redisConnection as never,
      concurrency: 2,
      limiter: { max: 150, duration: 3_600_000 },
    },
  );

  return { queue: crawlQueue, worker: crawlWorker };
}

export async function addCrawlJob(data: CrawlJobData): Promise<string> {
  if (!crawlQueue) throw new Error('Queue not initialized. Call initQueue first.');
  const job = await crawlQueue.add('crawl', data);
  return job.id || '';
}

export { crawlQueue, crawlWorker };
export type { CrawlJobData, CrawlJobResult };
