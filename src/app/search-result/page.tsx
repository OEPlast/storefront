import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchResultClient from './SearchResultClient';
import SearchLoading from './loading';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreName } from '@/libs/storeBranding';

interface SearchPageProps {
    searchParams: Promise<{ query?: string; }>;
}

// Generate dynamic metadata based on search query
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const [params, storeName] = await Promise.all([searchParams, getStoreName()]);
    const query = params.query || '';

    // Internal search results are intentionally NOT indexed (thin/duplicate).
    // High-demand queries get dedicated indexable landing pages instead.
    const noIndex = { index: false, follow: true } as const;

    if (query) {
        return getDefaultMetadata({
            title: `Search Results for "${query}"`,
            description: `Search results for "${query}". Find products matching your search query.`,
            keywords: [query, 'search', 'products', 'shop'],
            robots: noIndex,
            alternates: { canonical: '/search-result' },
            openGraph: {
                title: `Search Results for "${query}"`,
                description: `Find products matching "${query}" at ${storeName}.`,
            },
        });
    }

    return getDefaultMetadata({
        title: 'Search Products',
        description: `Search for products at ${storeName}. Find what you're looking for.`,
        keywords: ['search', 'products', 'find products'],
        robots: noIndex,
        alternates: { canonical: '/search-result' },
    });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const query = params.query || '';

    return (
        <Suspense fallback={<SearchLoading />}>
            <SearchResultClient searchQuery={query} />
        </Suspense>
    );
}
