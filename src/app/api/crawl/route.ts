/**
 * POST /api/crawl — Start a crawl job (runs full Antigravity pipeline)
 * GET  /api/crawl?jobId=xxx — Get job status
 *
 * Pipeline: Meta API scoring → Stage 1 (Metadata+OCR) → Stage 2 (Haiku) → Stage 3 (Sonnet) → Excel
 */
import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getPrisma } from '@/lib/db/prisma';

// In-memory job store
interface CrawlJob {
  status: string;
  progress: number;
  adsProcessed: number;
  adsTotal: number;
  currentBrand?: string;
  currentRegion?: string;
  currentStage?: number;
  markets: string[];
  keyword: string;
  mode: string;
  createdAt: string;
  excelPath?: string;
  sheetUrl?: string;
  error?: string;
}

const jobs = new Map<string, CrawlJob>();
const processes = new Map<string, ChildProcess>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markets, keyword, yourBrand } = body;

    if (!markets || !keyword) {
      return NextResponse.json(
        { error: 'Missing required fields: markets, keyword' },
        { status: 400 },
      );
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const adsPerBrand = 5;  // Fixed: always 5 ads/brand
    const brandsPerMarket = 5;
    const totalAds = markets.length * brandsPerMarket * adsPerBrand;

    const job: CrawlJob = {
      status: 'scoring',
      progress: 0,
      adsProcessed: 0,
      adsTotal: totalAds,
      markets,
      keyword,
      mode: 'default',
      createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    console.log(`[Antigravity] Crawl job created: ${jobId} | Markets: ${markets.join(', ')}`);

    // Delta crawl: write skip IDs first, then run the pipeline
    (async () => {
      try {
        await writeSkipIds(jobId);
      } catch (err: unknown) {
        console.log(`[Antigravity] Could not write skip IDs: ${err}`);
      }
      try {
        await runPipeline(jobId, job, keyword, markets, yourBrand || 'FusiForce');
      } catch (err) {
        console.error(`[Antigravity] Pipeline failed for ${jobId}:`, err);
        job.status = 'failed';
        job.error = String(err);
      }
    })();

    return NextResponse.json({
      jobId,
      status: 'scoring',
      message: `Crawl started. Markets: ${markets.join(', ')}`,
    });
  } catch (error) {
    console.error('Crawl API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Run the Python pipeline as a child process with streaming progress.
 */
async function runPipeline(
  jobId: string,
  job: CrawlJob,
  keyword: string,
  markets: string[],
  yourBrand: string,
) {
  const toolsDir = path.join(process.cwd(), 'tools');
  const outputDir = path.join(process.cwd(), '.tmp');
  const pipelineScript = path.join(toolsDir, 'pipeline.py');

  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Build args
  const args = [
    pipelineScript,
    '--keyword', keyword,
    '--markets', ...markets,
    '--your-brand', yourBrand,
    '--job-id', jobId,
    '--output-dir', outputDir,
  ];

  return new Promise<void>((resolve, reject) => {
    const proc = spawn('python', args, {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    processes.set(jobId, proc);

    let stdout = '';
    let lastPersistedCount = 0;
    let persistInFlight = false;
    let persistPending = false;
    const dataPath = path.join(outputDir, `${jobId}-data.json`);

    // Debounced persist: ensures only one persistRecords runs at a time.
    // If a persist is in-flight when a new one is requested, it queues ONE
    // follow-up (which will read the latest JSON file and capture everything).
    const debouncedPersist = () => {
      if (persistInFlight) {
        persistPending = true;
        return;
      }
      persistInFlight = true;
      persistRecords(dataPath, jobId)
        .catch((err: unknown) => {
          console.error(`[Antigravity] Incremental persist failed: ${err}`);
        })
        .finally(() => {
          persistInFlight = false;
          if (persistPending) {
            persistPending = false;
            debouncedPersist();
          }
        });
    };

    // Parse stderr for progress updates and log messages
    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('PROGRESS:')) {
          try {
            const update = JSON.parse(trimmed.slice(9));
            job.status = update.phase || job.status;
            job.progress = update.progress ?? job.progress;
            job.currentBrand = update.brand || job.currentBrand;
            job.currentRegion = update.region || job.currentRegion;
            job.currentStage = update.stage || job.currentStage;
            if (update.adsProcessed !== undefined) {
              job.adsProcessed = update.adsProcessed;
            }
          } catch { /* ignore malformed progress */ }
        } else {
          // Regular log line
          console.log(`[Pipeline ${jobId}] ${trimmed}`);

          // Capture Google Sheet URL from pipeline logs
          if (trimmed.includes('GSheet URL:')) {
            const urlMatch = trimmed.match(/GSheet URL:\s*(https:\/\/[^\s]+)/);
            if (urlMatch) {
              job.sheetUrl = urlMatch[1];
            }
          }

          // Trigger incremental DB persist when pipeline saves data
          // Fires on both per-ad JSON saves and per-brand full saves
          // Uses debounced persist to prevent concurrent upsert races
          if (trimmed.includes('[Incremental]') && job.adsProcessed > lastPersistedCount) {
            lastPersistedCount = job.adsProcessed;
            debouncedPersist();
          }
        }
      }
    });

    // Collect stdout for final result
    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on('close', async (code) => {
      processes.delete(jobId);

      // Wait for any in-flight persist to finish before final persist
      const waitForInflight = () => new Promise<void>((r) => {
        const check = () => { if (!persistInFlight) r(); else setTimeout(check, 100); };
        check();
      });

      // If the job was already stopped by the user (DELETE handler), don't treat as failure
      if (job.error === 'Stopped by user') {
        // Wait for in-flight persists, then do a final persist of ALL data
        await waitForInflight();
        try {
          await persistRecords(dataPath, jobId);
          console.log(`[Antigravity] Final persist after stop completed for ${jobId}`);
          // Update adsProcessed with actual DB count (not stale PROGRESS value)
          const dbCheck = getPrisma();
          if (dbCheck) {
            const actualCount = await dbCheck.adRecord.count();
            job.adsProcessed = actualCount;
            console.log(`[Antigravity] Actual DB count after stop: ${actualCount}`);
          }
        } catch (err: unknown) {
          console.error(`[Antigravity] Persist after stop failed: ${err}`);
        }
        // NOW mark as complete — dashboard polls will see the transition
        job.status = 'complete';
        job.progress = 100;
        persistCrawlJob(jobId, job).catch(() => {});
        resolve();
        return;
      }

      if (code !== 0) {
        // Still persist whatever data was saved before failure
        await waitForInflight();
        try {
          await persistRecords(dataPath, jobId);
        } catch { /* best effort */ }
        job.status = 'failed';
        job.error = `Pipeline exited with code ${code}`;
        reject(new Error(job.error));
        return;
      }

      // Parse final result from stdout
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        const result = JSON.parse(jsonLine);

        job.adsProcessed = result.recordCount || 0;
        job.excelPath = result.excelPath || '';
        job.status = 'complete';
        job.progress = 100;

        console.log(`[Antigravity] ${jobId} complete: ${job.adsProcessed} records`);

        // Final persist — wait for in-flight, then persist all
        await waitForInflight();
        try {
          await persistRecords(result.dataPath || dataPath, jobId);
        } catch (err: unknown) {
          console.error(`[Antigravity] DB persistence failed for ${jobId}:`, err);
        }
        persistCrawlJob(jobId, job).catch((err: unknown) => {
          console.error(`[Antigravity] CrawlJob persistence failed for ${jobId}:`, err);
        });
      } catch {
        // Still try to persist from the dataPath even if stdout parsing failed
        await waitForInflight();
        try {
          await persistRecords(dataPath, jobId);
        } catch { /* best effort */ }
        job.status = 'complete';
        job.progress = 100;
        console.log(`[Antigravity] ${jobId} finished (could not parse result)`);
      }

      resolve();
    });

    proc.on('error', (err) => {
      job.status = 'failed';
      job.error = `Failed to start pipeline: ${err.message}`;
      reject(err);
    });

    // Safety timeout: 60 minutes (discovery + per-brand Apify searches + per-ad AI analysis)
    const timeout = 3_600_000;
    setTimeout(() => {
      if (job.status !== 'complete' && job.status !== 'failed') {
        proc.kill();
        job.status = 'failed';
        job.error = 'Pipeline timed out';
        reject(new Error('Pipeline timed out'));
      }
    }, timeout);
  });
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    // Return in-memory jobs + completed jobs from DB (survives reloads)
    const memoryJobs = Array.from(jobs.entries()).map(([id, data]) => ({
      jobId: id,
      status: data.status,
      progress: data.progress,
      adsProcessed: data.adsProcessed,
      adsTotal: data.adsTotal,
      currentBrand: data.currentBrand,
      currentRegion: data.currentRegion,
      currentStage: data.currentStage,
      markets: data.markets,
      keyword: data.keyword,
      mode: data.mode,
      createdAt: data.createdAt,
      excelPath: data.excelPath,
      sheetUrl: data.sheetUrl,
      error: data.error,
    }));

    // Also load completed jobs from DB (for persistence across restarts)
    let dbJobs: typeof memoryJobs = [];
    try {
      const db = getPrisma();
      if (db) {
        const memoryJobIds = new Set(memoryJobs.map(j => j.jobId));
        const persisted = await db.crawlJob.findMany({
          where: { status: 'complete' },
          orderBy: { startedAt: 'desc' },
          take: 20,
        });
        dbJobs = persisted
          .filter((p: { id: string }) => !memoryJobIds.has(p.id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => ({
            jobId: p.id,
            status: p.status,
            progress: p.progress,
            adsProcessed: p.adsProcessed,
            adsTotal: p.adsTotal,
            currentBrand: p.currentBrand || undefined,
            currentRegion: p.currentRegion || undefined,
            currentStage: undefined,
            markets: p.markets,
            keyword: p.keyword,
            mode: p.mode,
            createdAt: p.startedAt.toISOString(),
            excelPath: p.excelPath || undefined,
            sheetUrl: p.sheetUrl || undefined,
            error: p.error || undefined,
          }));
      }
    } catch (err) {
      console.log(`[Antigravity] Could not load DB jobs: ${err}`);
    }

    // Also get total ad count from DB for the "latest" export info
    let totalAdsInDb = 0;
    let dbRegions: string[] = [];
    try {
      const db = getPrisma();
      if (db) {
        totalAdsInDb = await db.adRecord.count();
        const regionGroups = await db.adRecord.groupBy({ by: ['region'] });
        dbRegions = regionGroups.map((g: { region: string }) => g.region);
      }
    } catch { /* ignore */ }

    // Load latest strategic summary if available
    let strategicSummary = null;
    try {
      const tmpDir = path.join(process.cwd(), '.tmp');
      if (fs.existsSync(tmpDir)) {
        const summaryFiles = fs.readdirSync(tmpDir)
          .filter((f: string) => f.endsWith('-summary.json'))
          .map((f: string) => ({ name: f, mtime: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
          .sort((a: { mtime: number }, b: { mtime: number }) => b.mtime - a.mtime);
        if (summaryFiles.length > 0) {
          const raw = fs.readFileSync(path.join(tmpDir, summaryFiles[0].name), 'utf-8');
          strategicSummary = JSON.parse(raw);
        }
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      jobs: [...memoryJobs, ...dbJobs],
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1UIFNVFXM67OOfUMZDJUCUv1YjGC9myTKyN6QL8qbLFo',
      totalAdsInDb,
      dbRegions,
      strategicSummary,
    });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    progress: job.progress,
    adsProcessed: job.adsProcessed,
    adsTotal: job.adsTotal,
    currentBrand: job.currentBrand,
    currentRegion: job.currentRegion,
    currentStage: job.currentStage,
    markets: job.markets,
    keyword: job.keyword,
    mode: job.mode,
    createdAt: job.createdAt,
    excelPath: job.excelPath,
    sheetUrl: job.sheetUrl,
    error: job.error,
  });
}

/**
 * DELETE /api/crawl?jobId=xxx — Stop a running crawl job.
 * Kills the Python process and marks the job as failed. Already-saved data is preserved.
 */
export async function DELETE(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  const proc = processes.get(jobId);

  if (job) {
    // Set error BEFORE killing process so close handler sees it
    job.error = 'Stopped by user';
    // Don't set 'complete' yet — close handler will finalize after persist
    job.status = 'stopping';
  }

  if (proc) {
    proc.kill();
    processes.delete(jobId);
  }

  console.log(`[Antigravity] Job ${jobId} stopping — final persist in progress`);
  return NextResponse.json({ success: true, jobId, message: 'Crawl stopping. Saving data...' });
}

/**
 * Persist the CrawlJob record to the database.
 */
async function persistCrawlJob(jobId: string, job: CrawlJob) {
  const db = getPrisma();
  if (!db) {
    console.log(`[Antigravity] DB not available — skipping CrawlJob persistence`);
    return;
  }

  try {
    await db.crawlJob.upsert({
      where: { id: jobId },
      create: {
        id: jobId,
        markets: job.markets,
        keyword: job.keyword,
        yourBrand: 'FusiForce',
        mode: job.mode,
        status: job.status,
        progress: job.progress,
        adsProcessed: job.adsProcessed,
        adsTotal: job.adsTotal,
        currentBrand: job.currentBrand || null,
        currentRegion: job.currentRegion || null,
        excelPath: job.excelPath || null,
        sheetUrl: job.sheetUrl || null,
        error: job.error || null,
        completedAt: job.status === 'complete' ? new Date() : null,
      },
      update: {
        status: job.status,
        progress: job.progress,
        adsProcessed: job.adsProcessed,
        adsTotal: job.adsTotal,
        excelPath: job.excelPath || null,
        sheetUrl: job.sheetUrl || null,
        error: job.error || null,
        completedAt: job.status === 'complete' ? new Date() : null,
      },
    });
    console.log(`[Antigravity] CrawlJob ${jobId} persisted to DB`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[Antigravity] CrawlJob upsert failed: ${msg}`);
  }
}

/**
 * Write existing adLibraryIds from DB to a skip file so the pipeline skips them (delta crawl).
 */
async function writeSkipIds(jobId: string) {
  const db = getPrisma();
  if (!db) return;

  try {
    const existing = await db.adRecord.findMany({
      select: { adLibraryId: true },
    });
    const ids = existing.map((r: { adLibraryId: string }) => r.adLibraryId);
    if (ids.length > 0) {
      const skipPath = path.join(process.cwd(), '.tmp', `${jobId}-skip-ids.json`);
      fs.mkdirSync(path.dirname(skipPath), { recursive: true });
      fs.writeFileSync(skipPath, JSON.stringify(ids));
      console.log(`[Antigravity] Wrote ${ids.length} skip IDs for delta crawl`);
    }
  } catch (err: unknown) {
    console.log(`[Antigravity] Skip IDs query failed: ${err}`);
  }
}

/**
 * Persist pipeline records to PostgreSQL via Prisma.
 * Runs async after job completion — does not block the response.
 */
async function persistRecords(dataPath: string, jobId: string) {
  console.log(`[Antigravity] persistRecords called: dataPath=${dataPath}, jobId=${jobId}`);

  if (!dataPath) {
    console.log(`[Antigravity] No dataPath provided for ${jobId}`);
    return;
  }

  // Normalize path separators for Windows
  const normalizedPath = path.resolve(dataPath);
  if (!fs.existsSync(normalizedPath)) {
    console.log(`[Antigravity] Data file not found: ${normalizedPath}`);
    return;
  }

  const db = getPrisma();
  if (!db) {
    console.log(`[Antigravity] DB not available (DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'NOT SET'}) — skipping persistence for ${jobId}`);
    return;
  }

  const raw = fs.readFileSync(normalizedPath, 'utf-8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records) || records.length === 0) return;

  let persisted = 0;
  for (const rec of records) {
    const adLibraryId = rec.adLibraryId;
    if (!adLibraryId) continue;

    try {
      await db.adRecord.upsert({
        where: { adLibraryId },
        create: {
          brand: rec.brand || '',
          foreplayUrl: rec.foreplayUrl || '',
          landingPageUrl: rec.landingPageUrl || '',
          hook: rec.hook || '',
          concept: rec.concept || '',
          scriptBreakdown: rec.scriptBreakdown || '',
          visual: rec.visual || '',
          psychology: rec.psychology || '',
          cta: rec.cta || '',
          keyTakeaways: rec.keyTakeaways || '',
          productionFormula: rec.productionFormula || '',
          adScore: rec.adScore || 0,
          longevityDays: rec.longevityDays || 0,
          hookType: rec.hookType || '',
          primaryAngle: rec.primaryAngle || '',
          frameworkName: rec.frameworkName || '',
          creativePattern: rec.creativePattern || '',
          adLibraryId,
          adLibraryUrl: rec.adLibraryUrl || '',
          region: rec.region || 'US',
          keyword: rec.keyword || 'creatine gummies',
          status: rec.status || 'active',
          crawledAt: rec.crawledAt ? new Date(rec.crawledAt) : new Date(),
          videoUrl: rec.videoUrl || null,
          thumbnailUrl: rec.thumbnailUrl || null,
          durationSeconds: rec.durationSeconds || null,
          videoFormat: rec.videoFormat || null,
          pageName: rec.pageName || rec.brand || null,
          // New fields
          adStartDate: rec.adStartDate || null,
          adIterationCount: rec.adIterationCount ?? null,
          isActive: rec.isActive ?? true,
          impressionsLower: rec.impressionsLower || null,
          impressionsUpper: rec.impressionsUpper || null,
          spendLower: rec.spendLower || null,
          spendUpper: rec.spendUpper || null,
          spendCurrency: rec.spendCurrency || null,
          pageId: rec.pageId || null,
        },
        update: {
          hook: rec.hook || '',
          concept: rec.concept || '',
          scriptBreakdown: rec.scriptBreakdown || '',
          visual: rec.visual || '',
          psychology: rec.psychology || '',
          cta: rec.cta || '',
          keyTakeaways: rec.keyTakeaways || '',
          productionFormula: rec.productionFormula || '',
          adScore: rec.adScore || 0,
          longevityDays: rec.longevityDays || 0,
          hookType: rec.hookType || '',
          primaryAngle: rec.primaryAngle || '',
          frameworkName: rec.frameworkName || '',
          creativePattern: rec.creativePattern || '',
          status: rec.status || 'active',
          crawledAt: rec.crawledAt ? new Date(rec.crawledAt) : new Date(),
          // Update new fields too
          adStartDate: rec.adStartDate || null,
          adIterationCount: rec.adIterationCount ?? null,
          isActive: rec.isActive ?? true,
          impressionsLower: rec.impressionsLower || null,
          impressionsUpper: rec.impressionsUpper || null,
          spendLower: rec.spendLower || null,
          spendUpper: rec.spendUpper || null,
          spendCurrency: rec.spendCurrency || null,
          pageId: rec.pageId || null,
        },
      });
      persisted++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Antigravity] Failed to upsert ${adLibraryId}: ${msg}`);
    }
  }

  console.log(`[Antigravity] Persisted ${persisted}/${records.length} records to DB for ${jobId}`);
}
