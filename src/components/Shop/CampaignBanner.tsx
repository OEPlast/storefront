import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { getCdnUrl } from '@/libs/cdn-url';
import type { Campaign } from '@/types/campaign';

interface Props {
    campaign: Campaign;
}

export default function CampaignBanner({ campaign }: Props) {
    return (
        <div className="campaign-banner-block style-img">
            <div className="campaign-banner-main overflow-hidden relative">
                {/* Banner Image with dark overlay */}
                <div className="banner-image-container relative w-full h-auto max-h-[500px] overflow-hidden">
                    <Image
                        src={getCdnUrl(campaign.image)}
                        width={1920}
                        height={500}
                        alt={campaign.title}
                        className="w-full h-auto object-cover"
                        priority
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Content overlay - centered text */}
                <div className="container absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-content text-center max-w-3xl px-4">
                        {/* Campaign Title */}
                        <div className="heading2 text-white mb-4">{campaign.title}</div>

                        {/* Campaign Description */}
                        {campaign.description && (
                            <div className="body1 text-white/90 mb-6 max-w-2xl mx-auto">
                                {campaign.description}
                            </div>
                        )}

                        {/* Breadcrumb */}
                        <div className="link flex items-center justify-center gap-1 caption1 mt-4">
                            <Link href="/" className="text-white/80 hover:text-white transition-colors">
                                Homepage
                            </Link>
                            <Icon.CaretRight size={14} className="text-white/80" />
                            <span className="text-white capitalize">{campaign.title}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
