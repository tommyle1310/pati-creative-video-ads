/**
 * POST /api/resync — Re-sync all records from DB to Google Sheet.
 * Used when the sheet gets out of sync (rate limits, stale data, etc.)
 */
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getPrisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    const db = getPrisma();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Get all records from DB
    const records = await db.adRecord.findMany({
      orderBy: { adScore: 'desc' },
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records in database to sync' }, { status: 404 });
    }

    // Write records to a temp JSON file for the Python script
    const tmpDir = path.join(process.cwd(), '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const dataPath = path.join(tmpDir, 'resync-data.json');

    // Convert Prisma records to the format gsheet_writer expects
    const jsonRecords = records.map((r) => ({
      brand: r.brand,
      foreplayUrl: r.foreplayUrl,
      landingPageUrl: r.landingPageUrl,
      hook: r.hook,
      concept: r.concept,
      scriptBreakdown: r.scriptBreakdown,
      visual: r.visual,
      psychology: r.psychology,
      cta: r.cta,
      keyTakeaways: r.keyTakeaways,
      productionFormula: r.productionFormula,
      adScore: r.adScore,
      longevityDays: r.longevityDays,
      hookType: r.hookType,
      primaryAngle: r.primaryAngle,
      frameworkName: r.frameworkName,
      creativePattern: r.creativePattern || '',
      adLibraryId: r.adLibraryId,
      adLibraryUrl: r.adLibraryUrl,
      region: r.region,
      keyword: r.keyword,
      status: r.status,
      crawledAt: r.crawledAt?.toISOString() ?? '',
      videoUrl: r.videoUrl ?? '',
      thumbnailUrl: r.thumbnailUrl ?? '',
      durationSeconds: r.durationSeconds ?? 0,
      videoFormat: r.videoFormat ?? '',
      adStartDate: r.adStartDate ?? '',
      adIterationCount: r.adIterationCount ?? 1,
      isActive: r.isActive,
      impressionsLower: r.impressionsLower ?? '',
      impressionsUpper: r.impressionsUpper ?? '',
      spendLower: r.spendLower ?? '',
      spendUpper: r.spendUpper ?? '',
      spendCurrency: r.spendCurrency ?? '',
      pageName: r.pageName ?? r.brand,
    }));

    fs.writeFileSync(dataPath, JSON.stringify(jsonRecords, null, 2));

    // Run gsheet_writer.py with the data file
    const toolsDir = path.join(process.cwd(), 'tools');
    const script = path.join(toolsDir, 'gsheet_writer.py');

    return new Promise<NextResponse>((resolve) => {
      const proc = spawn('python', [script, '--data-file', dataPath], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.log(`[Resync] ${data.toString().trim()}`);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error(`[Resync] Failed with code ${code}: ${stderr}`);
          resolve(NextResponse.json({
            error: `Resync failed (exit code ${code})`,
            details: stderr.slice(-500),
          }, { status: 500 }));
          return;
        }

        // Extract sheet URL from stdout
        const urlMatch = stdout.match(/Spreadsheet URL:\s*(https:\/\/[^\s]+)/);
        const sheetUrl = urlMatch ? urlMatch[1] : '';

        resolve(NextResponse.json({
          success: true,
          recordCount: records.length,
          sheetUrl,
          message: `Successfully synced ${records.length} records to Google Sheet`,
        }));
      });

      proc.on('error', (err) => {
        resolve(NextResponse.json({
          error: `Failed to start resync: ${err.message}`,
        }, { status: 500 }));
      });

      // 2 minute timeout
      setTimeout(() => {
        proc.kill();
        resolve(NextResponse.json({
          error: 'Resync timed out after 2 minutes',
        }, { status: 504 }));
      }, 120_000);
    });
  } catch (error) {
    console.error('[Resync] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
