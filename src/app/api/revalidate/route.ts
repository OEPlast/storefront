import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/**
 * On-demand cache purge. Main-server calls this after a write commits
 * (`src/services/storefront/revalidate.ts`), so a price change, a new product or a sale starting
 * shows up within seconds instead of waiting out the 12-hour schedule.
 *
 *   POST /api/revalidate
 *   X-Revalidate-Secret: <REVALIDATE_SECRET>
 *   { "tags": ["product:blue-chair", "products"], "paths": ["/deals"] }
 *
 * `/api/revalidate-branding` still exists and does the same thing for the single `branding` tag;
 * it is kept so an older Main-server build keeps working.
 */

/** Cap per request. Main-server batches, and a purge of 100 tags is already a lot of work. */
const MAX_TAGS = 100;
const MAX_PATHS = 50;

/**
 * Only tags this app actually attaches to fetches. Without an allowlist, anything holding the
 * secret could purge arbitrary strings — harmless individually, but an easy way to force the whole
 * site to regenerate over and over. Keep in step with `libs/api/cacheTags.ts`.
 */
const TAG_PATTERN =
  /^(?:products|categories|campaigns|banners|intents|branding|delivery-config)$|^(?:product|category|campaign|intent):[^\s,]{1,200}$/;

/** Site-relative paths only — no protocol, no `..`, no query string. */
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~/%]{0,200}$/;

function secretMatches(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get('X-Revalidate-Secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown; };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const tags = Array.isArray(body.tags) ? body.tags : [];
  const paths = Array.isArray(body.paths) ? body.paths : [];

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json({ error: 'Nothing to revalidate: send tags and/or paths' }, { status: 400 });
  }
  if (tags.length > MAX_TAGS || paths.length > MAX_PATHS) {
    return NextResponse.json({ error: `At most ${MAX_TAGS} tags and ${MAX_PATHS} paths per request` }, { status: 400 });
  }

  const badTag = tags.find((t) => typeof t !== 'string' || !TAG_PATTERN.test(t));
  if (badTag !== undefined) {
    return NextResponse.json({ error: `Unknown tag: ${String(badTag).slice(0, 80)}` }, { status: 400 });
  }
  const badPath = paths.find((p) => typeof p !== 'string' || !PATH_PATTERN.test(p));
  if (badPath !== undefined) {
    return NextResponse.json({ error: `Invalid path: ${String(badPath).slice(0, 80)}` }, { status: 400 });
  }

  // `Array.from`, not spread: this app's tsconfig targets ES5, where spreading a Set doesn't compile.
  const uniqueTags = Array.from(new Set(tags as string[]));
  const uniquePaths = Array.from(new Set(paths as string[]));

  for (const tag of uniqueTags) revalidateTag(tag);
  for (const path of uniquePaths) revalidatePath(path);

  return NextResponse.json({ revalidated: true, tags: uniqueTags, paths: uniquePaths });
}
