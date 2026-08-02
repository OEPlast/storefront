/** @type {import('next').NextConfig} */

// Canonical host (apex → www). Derived from the public site URL so it tracks env.
const SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://www.rawura.com';
let CANONICAL_HOST = 'www.rawura.com';
let APEX_HOST = 'rawura.com';
try {
    CANONICAL_HOST = new URL(SITE_URL).host; // e.g. www.rawura.com
    APEX_HOST = CANONICAL_HOST.replace(/^www\./, ''); // e.g. rawura.com
} catch (_) {
    /* keep defaults */
}

const nextConfig = {
    reactStrictMode: true,
    // Emit a single URL form for every page (no duplicate trailing-slash variants).
    trailingSlash: false,
    images: {
        // Modern formats first for better LCP / smaller payloads (CWV).
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'oeptest.b-cdn.net',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'isomorphic-furyroad.s3.amazonaws.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'placeholder.com',
                pathname: '/**',
            },
        ],
    },
    // SEO: 301 the apex domain to the canonical www host so ranking signals
    // never split across two hostnames. Only active in production hosting where
    // the apex actually resolves to this app.
    //
    // In practice Vercel already 308s rawura.com → www.rawura.com at the edge, so
    // this rule is a backstop for other hosts. It stays disabled unless the two
    // hosts genuinely differ: if NEXT_PUBLIC_MAIN_SITE_URL is ever set without the
    // `www.` prefix (or to localhost), APEX_HOST === CANONICAL_HOST and the rule
    // would redirect a host to itself — an infinite loop that browsers cache
    // permanently, because `permanent: true` is a 301.
    async redirects() {
        if (!APEX_HOST || !CANONICAL_HOST || APEX_HOST === CANONICAL_HOST) {
            return [];
        }
        return [
            {
                source: '/:path*',
                has: [{ type: 'host', value: APEX_HOST }],
                destination: `https://${CANONICAL_HOST}/:path*`,
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
