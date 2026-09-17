export { auth as middleware } from "./auth";

/**
 * Without a matcher this ran NextAuth on *every* request — including `_next/static` chunks, images
 * and fonts — so each asset paid for a session decode. With it, the only requests that touch the
 * session are page requests, which keeps the edge work proportional to page views.
 *
 * Excluded:
 *  - `api/`     — this app's own routes (`/api/og`, `/api/revalidate`) authenticate themselves.
 *  - `_next/*`  — build output and the image optimiser.
 *  - file paths — anything with a static-asset extension, plus the SEO files at the root.
 *
 * This does not make pages dynamic: middleware runs before the cache and does not read the request
 * inside a render. What made every page dynamic was `auth()` inside the root layout, which is gone
 * (see src/provider/Server-queries.tsx).
 */
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|woff|woff2|ttf|otf)$).*)',
  ],
};
