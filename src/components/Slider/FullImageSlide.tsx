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

interface FullImageSlideProps {
    banner: Banner;
    priority?: boolean;
}

const FullImageSlide: React.FC<FullImageSlideProps> = ({ banner, priority = false }) => {
    return (
        <div className="slider-item h-full w-full relative bg-surface">
            <Image
                src={getCdnUrl(banner.imageUrl)}
                fill
                alt={banner.name}
                priority={priority}
                className='object-cover'
            />
            <div className="absolute inset-0 flex items-center">
                <div className="text-content md:pl-16 pl-5 z-10 text-white">
                    {banner.headerText && (
                        <div className="text-sub-display">{banner.headerText}</div>
                    )}
                    {banner.mainText && (
                        <div className="heading2 md:mt-5 mt-2">{banner.mainText}</div>
                    )}
                    {banner.CTA && banner.pageLink && (
                        <Link href={banner.pageLink} className="button-main text-green md:mt-8 mt-3">
                            {banner.CTA}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FullImageSlide;
