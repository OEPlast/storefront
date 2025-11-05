import type { Metadata } from 'next';
import Footer from '@/components/Footer/Footer';
import CampaignClient from './CampaignClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverGet } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { Campaign } from '@/types/campaign';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Campaign - OEPlast',
    description: 'Browse products in this campaign',
};

export default async function CampaignPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string; }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const serverSearchParams = searchParams ? await searchParams : undefined;

    // Try to fetch campaign data on server
    let campaignNotFound = false;
    const queryClient = new QueryClient();

    try {
        await queryClient.prefetchQuery({
            queryKey: ['campaigns', 'info', slug],
            queryFn: async () => {
                const response = await serverGet<Campaign>(
                    `${api.campaigns.info(slug)}`
                );
                if (!response) throw new Error('Campaign not found');
                return response;
            },
        });
    } catch (error) {
        // Campaign not found - show 404 page
        campaignNotFound = true;
    }

    // If campaign not found, show 404 page without dehydrating
    if (campaignNotFound) {
        return (
            <>
                <div className="campaign-not-found flex items-center justify-center" style={{ minHeight: '90vh' }}>
                    <div className="container">
                        <div className="text-center max-w-xl mx-auto px-4">
                            <div className="heading2 mb-4">Campaign Not Found</div>
                            <div className="body1 text-secondary2 mb-8">
                                The campaign you&apos;re looking for doesn&apos;t exist or is no longer active.
                            </div>
                            <Link
                                href="/"
                                className="button-main bg-black text-white inline-block px-8 py-3 rounded-lg hover:bg-black/80 transition-colors"
                            >
                                Back to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CampaignClient slug={slug} searchParams={serverSearchParams} />
            <Footer />
        </HydrationBoundary>
    );
}
