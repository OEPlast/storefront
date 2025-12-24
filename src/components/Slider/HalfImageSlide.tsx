'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCdnUrl } from '@/libs/cdn-url';

interface Banner {
    _id: string;
    name: string;
    imageUrl: string;
    headerText?: string;
    mainText?: string;
    CTA?: string;
    pageLink?: string;
}

interface HalfImageSlideProps {
    banner: Banner;
    priority?: boolean;
}

const HalfImageSlide: React.FC<HalfImageSlideProps> = ({ banner, priority = false }) => {
    return (
        <div className="slider-item h-full w-full flex items-center bg-surface relative">
            <div className="text-content md:pl-10 pl-5 basis-1/2">
                {banner.headerText && (
                    <div className="text-sub-display">{banner.headerText}</div>
                )}
                {banner.mainText && (
                    <div className="heading3 md:mt-4 mt-2">{banner.mainText}</div>
                )}
                {banner.CTA && banner.pageLink && (
                    <Link href={banner.pageLink} className="button-main text-green md:mt-4 mt-3">
                        {banner.CTA}
                    </Link>
                )}
            </div>
            <div className="relative h-full sm:w-[50%] w-[60%] sm:right-0 bottom-0">
                {/* Fade-in gradient overlay from left */}
                <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-surface to-transparent" style={{ width: '3%' }} />
                <div className="absolute inset-0">
                    <Image
                        src={getCdnUrl(banner.imageUrl)}
                        width={2000}
                        height={1936}
                        alt={banner.name}
                        priority={priority}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
};

export default HalfImageSlide;
