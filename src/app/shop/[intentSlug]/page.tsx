import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getDefaultMetadata } from '@/libs/seo';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import { getIntent, getAllIntents, type IntentProduct } from '@/config/intents';
import {
    generateCollectionSchema,
    generateItemListSchema,
    generateBreadcrumbSchema,
    generateFAQSchema,
    injectStructuredData,
    type ListItemProduct,
} from '@/libs/structured-data';

// Quality gate: never publish a thin/doorway page. Below this many products we 404.
const MIN_PRODUCTS = 3;

export const revalidate = 3600;

// Pre-render published intents (a small, curated set managed in the admin panel).
export async function generateStaticParams() {
    const intents = await getAllIntents();
    return intents.map((intent) => ({ intentSlug: intent.slug }));
}

function coverImageOf(p: IntentProduct): string | undefined {
    const imgs = p.description_images?.length ? p.description_images : p.images;
    const cover = imgs?.find((i) => i.cover_image) || imgs?.[0];
    return cover ? getCdnUrl(cover.url) : undefined;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ intentSlug: string }>;
}): Promise<Metadata> {
    const { intentSlug } = await params;
    const intent = await getIntent(intentSlug);
    if (!intent) {
        return getDefaultMetadata({ title: 'Not Found', robots: { index: false, follow: true } });
    }

    // Only index if the page actually has enough products to be useful. The
    // backend blocks publishing below this, but curated products can be archived
    // afterwards — so re-check against what actually came back.
    const indexable = intent.products.length >= MIN_PRODUCTS;

    return getDefaultMetadata({
        title: intent.title,
        description: intent.description,
        keywords: intent.keywords,
        robots: { index: indexable, follow: true },
        alternates: { canonical: `/shop/${intent.slug}` },
        openGraph: {
            title: intent.title,
            description: intent.description,
            url: `/shop/${intent.slug}`,
            type: 'website',
        },
    });
}

export default async function IntentPage({
    params,
}: {
    params: Promise<{ intentSlug: string }>;
}) {
    const { intentSlug } = await params;
    const intent = await getIntent(intentSlug);
    if (!intent) notFound();

    // Curated products, already in admin-defined display order, with archived or
    // deleted ones stripped out by the backend.
    const products = intent.products;

    // Quality gate — a curated intent with too few products is not a real page.
    if (products.length < MIN_PRODUCTS) notFound();

    const listProducts: ListItemProduct[] = products.map((p) => ({
        name: p.name,
        slug: p.slug,
        image: coverImageOf(p),
        price: p.price,
        inStock: (p.stock ?? 0) > 0,
    }));

    const basePath = `/shop/${intent.slug}`;

    return (
        <>
            {injectStructuredData(
                generateCollectionSchema({
                    name: intent.heading,
                    description: intent.description,
                    url: basePath,
                }),
                'ld-collection'
            )}
            {injectStructuredData(
                generateBreadcrumbSchema([
                    { name: 'Homepage', url: '/' },
                    { name: 'Shop', url: '/shop' },
                    { name: intent.heading, url: basePath },
                ]),
                'ld-breadcrumb'
            )}
            {injectStructuredData(generateItemListSchema(listProducts, intent.heading), 'ld-itemlist')}
            {intent.faqs?.length &&
                injectStructuredData(generateFAQSchema(intent.faqs), 'ld-faq')}

            <div className="container py-10">
                <nav aria-label="Breadcrumb" className="mb-4 text-sm text-secondary">
                    <Link href="/" className="hover:underline">
                        Home
                    </Link>{' '}
                    / <span aria-current="page">{intent.heading}</span>
                </nav>

                <header className="mb-8">
                    <h1 className="heading3">{intent.heading}</h1>
                    {intent.intro && <p className="body1 mt-3 max-w-3xl text-secondary">{intent.intro}</p>}
                </header>

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
                                    <span className="mt-1 block font-semibold">{formatToNaira(p.price)}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {intent.faqs?.length ? (
                    <section className="mt-12 max-w-3xl">
                        <h2 className="heading5 mb-4">Frequently asked questions</h2>
                        <dl className="flex flex-col gap-4">
                            {intent.faqs.map((f) => (
                                <div key={f.question}>
                                    <dt className="font-semibold">{f.question}</dt>
                                    <dd className="mt-1 text-secondary">{f.answer}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ) : null}
            </div>
        </>
    );
}
