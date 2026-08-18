import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Called by Main-server the moment the Settings document is saved. Nothing else busts the
 * `branding` cache tag — the fetch in `libs/storeBranding.ts` otherwise caches indefinitely.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Revalidate-Secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('branding');
  return NextResponse.json({ revalidated: true });
}
