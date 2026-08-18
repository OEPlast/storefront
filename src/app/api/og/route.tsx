import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Kept self-contained (not imported from libs/cdn-url.ts) since this route runs on the Edge
// Runtime — env var read directly rather than pulling in that module's dependency surface.
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://oeptest.b-cdn.net/';

function buildCdnUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_BASE_URL}${cleanPath}`;
}

/**
 * Convert a .webp URL/path to its .png counterpart for OG image compatibility.
 * Satori (next/og) doesn't support WebP, so we use the PNG version stored on CDN.
 */
function toPngUrl(url: string): string {
  if (!url) return '';
  return url.replace(/\.webp$/i, '.png');
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);
}

async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error('Failed to load font data');
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') || 'Product';
  const price = searchParams.get('price') || '0';
  const image = searchParams.get('image') || '';
  const discount = searchParams.get('discount') || '';
  const category = searchParams.get('category') || '';
  const description = searchParams.get('description') || '';

  const priceNum = Number(price);
  const discountNum = Number(discount);
  const hasDiscount = discountNum > 0;
  const finalPrice = hasDiscount ? priceNum * (1 - discountNum / 100) : priceNum;

  const imageUrl = toPngUrl(buildCdnUrl(image));

  // Collect all text that will be rendered to only load needed glyphs
  const allText = [
    name,
    formatPrice(finalPrice),
    hasDiscount ? formatPrice(priceNum) : '',
    hasDiscount ? `${discountNum}% OFF` : '',
    description,
    category,
    'Buy Now',
    'No Image',
    'R',
  ].join('');

  const fontData = await loadGoogleFont('Inter', allText);

  // Fetch logo
  let logoData: ArrayBuffer | null = null;
  try {
    const logoRes = await fetch(
      new URL('/images/brand/logoTransparent.png', req.nextUrl.origin).toString()
    );
    if (logoRes.ok) logoData = await logoRes.arrayBuffer();
  } catch {
    // Logo fetch failed, proceed without it
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'Inter',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Left panel — 55% */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '55%',
            height: '100%',
            padding: '56px 60px',
            gap: '10px',
          }}
        >
          {/* Logo */}
          {logoData ? (
            <img
              src={`data:image/png;base64,${Buffer.from(logoData).toString('base64')}`}
              alt=""
              width={196}
              height={46}
              style={{ marginBottom: '12px' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#2D5016',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: 'white',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              R
            </div>
          )}

          {/* Category */}
          {category && (
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                color: '#2D5016',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          )}

          {/* Prices */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#111111',
                lineHeight: 1,
              }}
            >
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <span
                style={{
                  fontSize: 26,
                  color: '#aaaaaa',
                  textDecoration: 'line-through',
                }}
              >
                {formatPrice(priceNum)}
              </span>
            )}
          </div>

          {/* Discount badge */}
          {hasDiscount && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  background: '#DC2626',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 6,
                }}
              >
                {discountNum}% OFF
              </div>
            </div>
          )}

          {/* Product Name */}
          <div
            style={{
              fontSize: name.length > 40 ? 30 : 36,
              fontWeight: 700,
              color: '#111111',
              lineHeight: 1.2,
              display: 'flex',
            }}
          >
            {name.length > 60 ? name.substring(0, 57) + '...' : name}
          </div>

          {/* Description — always shown when available */}
          {description && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: '#555555',
                lineHeight: 1.5,
              }}
            >
              {description.length > 110 ? description.substring(0, 107) + '...' : description}
            </div>
          )}

          {/* Buy Now button */}
          <div style={{ display: 'flex', marginTop: '18px' }}>
            <div
              style={{
                display: 'flex',
                background: '#2D5016',
                color: 'white',
                fontSize: 28,
                fontWeight: 700,
                padding: '18px 56px',
                borderRadius: 10,
                letterSpacing: '0.01em',
              }}
            >
              Buy Now
            </div>
          </div>
        </div>

        {/* Right panel — 45%, image fills full area */}
        <div
          style={{
            display: 'flex',
            width: '45%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              width={540}
              height={630}
              style={{
                objectFit: 'contain',
                width: '100%',
                height: '100%',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cccccc',
                fontSize: 22,
              }}
            >
              No Image
            </div>
          )}
        </div>

        {/* Bottom border accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: '#2D5016',
            display: 'flex',
          }}
        />

        {/* Gradient seam overlay at 55/45 boundary */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '49%',
            width: '10%',
            background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0) 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  );
}
