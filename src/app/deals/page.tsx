import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { serverGetWithMeta } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { ProductListItem } from '@/types/product';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreName } from '@/libs/storeBranding';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import {
    generateCollectionSchema,
    generateItemListSchema,
    generateBreadcrumbSchema,
    injectStructuredData,
    type ListItemProduct,
} from '@/libs/structured-data';

// Revalidate hourly — deals change often but not per-request.
export const revalidate = 3600;

const PAGE_TITLE = 'Deals & Offers';

function pageDescFor(storeName: string): string {
    return `Shop the best deals, discounts and daily offers at ${storeName}. Save on quality products with free delivery across Nigeria and 7-day returns.`;
}

export async function generateMetadata(): Promise<Metadata> {
    const storeName = await getStoreName();
    const description = pageDescFor(storeName);

    return getDefaultMetadata({
        title: PAGE_TITLE,
        description,
        keywords: ['deals', 'offers', 'discounts', 'sale', 'daily deals', storeName, 'Nigeria'],
        alternates: { canonical: '/deals' },
        openGraph: {
            title: PAGE_TITLE,
            description,
            url: '/deals',
            type: 'website',
        },
    });
}

function coverImageOf(p: ProductListItem): string | undefined {
    const imgs = p.description_images?.length ? p.description_images : p.images;
    const cover = imgs?.find((i) => i.cover_image) || imgs?.[0];
    return cover ? getCdnUrl(cover.url) : undefined;
}

async function fetchDeals(): Promise<ProductListItem[]> {
    const results = await Promise.allSettled([
        serverGetWithMeta<ProductListItem[]>(`${api.products.dealsOfTheDay}?page=1&limit=48`),
        serverGetWithMeta<ProductListItem[]>(`${api.products.hotSales}?page=1&limit=48`),
    ]);

    const merged: ProductListItem[] = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && Array.isArray(r.value.data)) {
            merged.push(...r.value.data);
        }
    }
    // De-dupe by slug, preserve order.
    const seen = new Set<string>();
    return merged.filter((p) => {
        if (!p?.slug || seen.has(p.slug)) return false;
        seen.add(p.slug);
        return true;
    });
}

export default async function DealsPage() {
    const [products, storeName] = await Promise.all([fetchDeals(), getStoreName()]);
    const description = pageDescFor(storeName);

    const listProducts: ListItemProduct[] = products.map((p) => ({
        name: p.name,
        slug: p.slug,
        image: coverImageOf(p),
        price: p.price,
        inStock: (p.stock ?? 0) > 0,
    }));

    return (
        <>
            {injectStructuredData(
                generateCollectionSchema({ name: PAGE_TITLE, description, url: '/deals' }),
                'ld-collection'
            )}
            {injectStructuredData(
                generateBreadcrumbSchema([
                    { name: 'Homepage', url: '/' },
                    { name: 'Deals', url: '/deals' },
                ]),
                'ld-breadcrumb'
            )}
            {listProducts.length > 0 &&
                injectStructuredData(
                    generateItemListSchema(listProducts, PAGE_TITLE),
                    'ld-itemlist'
                )}

            <div className="container py-10">
                <nav aria-label="Breadcrumb" className="mb-4 text-sm text-secondary">
                    <Link href="/" className="hover:underline">
                        Home
                    </Link>{' '}
                    / <span aria-current="page">Deals</span>
                </nav>

                <header className="mb-8">
                    <h1 className="heading3">Deals &amp; Offers</h1>
                    <p className="body1 mt-2 text-secondary">
                        Save big on quality products. Free delivery across Nigeria &middot; 7-day returns.
                    </p>
                </header>

                {listProducts.length === 0 ? (
                    <p className="body1 text-secondary">
                        No live deals right now. Check back soon or{' '}
                        <Link href="/" className="underline">
                            browse all products
                        </Link>
                        .
                    </p>
                ) : (
                    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map((p) => {
                            const img = coverImageOf(p);
                            return (
                                <li key={p.slug} className="rounded-lg border border-line p-3">
                                    <Link href={`/product/${p.slug}`} className="block">
                                        {img && (
                                            <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-surface">
                                                <Image
                                                    src={img}
                                                    alt={p.name}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <span className="text-title line-clamp-2 block">{p.name}</span>
                                        <span className="mt-1 block font-semibold">
                                            {formatToNaira(p.price)}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}
