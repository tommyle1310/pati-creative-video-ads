/**
 * GET /api/export — Download Excel intelligence file or get Google Sheet URL
 * Query params:
 *   jobId (optional — defaults to "latest")
 *   format (optional — "sheet" returns Google Sheet URL, default downloads xlsx)
 *
 * Files use naming: latest-{regions}-{timestamp}.xlsx
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UIFNVFXM67OOfUMZDJUCUv1YjGC9myTKyN6QL8qbLFo';

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format');

  // If requesting the Google Sheet URL
  if (format === 'sheet') {
    return NextResponse.json({ url: SHEET_URL });
  }

  const jobId = request.nextUrl.searchParams.get('jobId') || 'latest';
  const dataDir = path.join(process.cwd(), 'data');

  // Find Excel files in data/, sorted by modification time (newest first)
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.xlsx'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(dataDir, a));
        const statB = fs.statSync(path.join(dataDir, b));
        return statB.mtimeMs - statA.mtimeMs;
      });

    if (files.length > 0) {
      // If looking for specific jobId, try to find it
      if (jobId !== 'latest') {
        const match = files.find(f => f.includes(jobId));
        if (match) {
          return serveExcel(path.join(dataDir, match), match);
        }
      }
      // Otherwise serve the newest file
      return serveExcel(path.join(dataDir, files[0]), files[0]);
    }
  }

  return NextResponse.json(
    { error: 'No export file found. Run a crawl first via POST /api/crawl' },
    { status: 404 },
  );
}

function serveExcel(filePath: string, fileName: string) {
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
