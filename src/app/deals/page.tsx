import type { Metadata } from 'next';
import Link from 'next/link';
import { serverGetWithMeta } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { ProductListItem } from '@/types/product';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';
import { getCdnUrl } from '@/libs/cdn-url';
import ProductSection from '@/components/Home7/ProductSection';
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

// Only "free" delivery when there is a free-delivery threshold would be true for every order, so
// the copy says delivery, not free delivery. The return window comes from the server.
function pageDescFor(storeName: string, returnDays: number): string {
    return `Shop the best deals, discounts and daily offers at ${storeName}. Save on quality products with delivery across Nigeria and ${returnDays}-day returns.`;
}

export async function generateMetadata(): Promise<Metadata> {
    const { storeName, policies } = await getStoreBranding();
    const description = pageDescFor(storeName, policies.returnWindowDays);

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
    const [products, { storeName, policies }] = await Promise.all([fetchDeals(), getStoreBranding()]);
    const description = pageDescFor(storeName, policies.returnWindowDays);

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

            <div className="pb-10 md:pb-20">
                <div className="container pt-10">
                    <nav aria-label="Breadcrumb" className="text-sm text-secondary">
                        <Link href="/" className="hover:underline">
                            Home
                        </Link>{' '}
                        / <span aria-current="page">Deals</span>
                    </nav>
                </div>

                {/* Same section the homepage uses, so deals render as full product cards (add to
                    cart, wishlist, quick view, sale badges). The products are still fetched here on
                    the server, so ISR and the structured data above are unchanged; the client
                    component only receives the plain product array. */}
                <ProductSection
                    data={products}
                    header={PAGE_TITLE}
                    headingAs="h1"
                    description={`Save big on quality products. Delivery across Nigeria · ${policies.returnWindowDays}-day returns.`}
                    showCountdown
                    isLoading={false}
                    spacingClassName="pt-4"
                />

                {products.length === 0 && (
                    <div className="container">
                        <p className="body1 text-secondary">
                            No live deals right now. Check back soon or{' '}
                            <Link href="/" className="underline">
                                browse all products
                            </Link>
                            .
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
