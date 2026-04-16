import { NextResponse, type NextRequest } from 'next/server';
import { find as findTimezone } from 'geo-tz';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');

  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const timezones = findTimezone(lat, lon);
  const timezone = timezones[0] ?? null;

  return NextResponse.json({ timezone });
}
