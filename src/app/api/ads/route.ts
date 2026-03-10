/**
 * GET /api/ads — Query stored ad records
 * Query params: region, brand, minScore, hookType, limit, offset
 */
import { NextRequest, NextResponse } from 'next/server';

// Sample data for dashboard display (before DB is connected)
const SAMPLE_ADS = [
  {
    id: 'sample-001',
    brand: 'Create Wellness',
    region: 'US',
    hookType: 'Curiosity Gap + Pattern-Interrupt Visual Hook',
    primaryAngle: "The Trusted Friend's Discovery",
    adScore: 8.2,
    longevityDays: 95,
    status: 'active',
    foreplayUrl: 'https://app.foreplay.co/share/ads/gKOjAxdxI3E7FfSAJm9k',
    landingPageUrl: 'https://trycreate.co/pages/all-products-women-sub-only',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const region = searchParams.get('region');
  const brand = searchParams.get('brand');
  const minScore = searchParams.get('minScore');
  const hookType = searchParams.get('hookType');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // In production, this queries Prisma. For now, return sample data.
  let filtered = [...SAMPLE_ADS];

  if (region) filtered = filtered.filter(a => a.region === region);
  if (brand) filtered = filtered.filter(a => a.brand.toLowerCase().includes(brand.toLowerCase()));
  if (minScore) filtered = filtered.filter(a => a.adScore >= parseFloat(minScore));
  if (hookType) filtered = filtered.filter(a => a.hookType.toLowerCase().includes(hookType.toLowerCase()));

  return NextResponse.json({
    ads: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  });
}
