import { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchResultClient from './SearchResultClient';
import SearchLoading from './loading';
import { getDefaultMetadata } from '@/libs/seo';

interface SearchPageProps {
    searchParams: Promise<{ query?: string; }>;
}

// Generate dynamic metadata based on search query
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
    const params = await searchParams;
    const query = params.query || '';

    if (query) {
        return getDefaultMetadata({
            title: `Search Results for "${query}"`,
            description: `Search results for "${query}". Find products matching your search query.`,
            keywords: [query, 'search', 'products', 'shop'],
            openGraph: {
                title: `Search Results for "${query}"`,
                description: `Find products matching "${query}" at Rawura.`,
            },
        });
    }

    return getDefaultMetadata({
        title: 'Search Products',
        description: 'Search for products at Rawura. Find what you\'re looking for.',
        keywords: ['search', 'products', 'find products'],
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
