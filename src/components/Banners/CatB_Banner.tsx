'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAllBanners, useGroupedBanners } from '@/hooks/queries/useBanners';
import { getCdnUrl } from '@/libs/cdn-url';

const CatB_Banner = () => {
    const { data: banners, isFetching, isLoading } = useGroupedBanners(true);
    const CAT_B_Banners = banners?.B.slice(0, 3) || [];

    if (CAT_B_Banners.length === 0) {
        return null;
    }
    return (
        <>
            <div className="banner-block md:pt-20 pt-10">
                <div className="container">
                    <div className={`list-banner grid ${CAT_B_Banners.length <= 2 ? 'md:grid-cols-2 ' : 'lg:grid-cols-3 md:grid-cols-2 '} lg:gap-[30px] gap-[20px]`}>
                        {CAT_B_Banners.map((banner, index) => (
                            <Link
                                key={banner._id || index}
                                href={banner.pageLink || '/shop/breadcrumb-img'}
                                className={`banner-item relative block duration-500 ${index === 2 ? 'max-lg:hidden' : ''}`}
                            >
                                <div className="banner-img w-full rounded-2xl overflow-hidden">
                                    <Image
                                        src={getCdnUrl(banner.imageUrl)}
                                        width={600}
                                        height={400}
                                        alt={banner.name || 'banner'}
                                        className='w-full duration-500 max-h-[370px]'
                                    />
                                </div>
                                <div className="banner-content absolute left-[30px] top-1/2 -translate-y-1/2">
                                    <div className="heading3 text-white whitespace-pre-line break-words max-w-[90%]">
                                        {banner.headerText || ''}
                                    </div>
                                    <div className="text-base text-gray-100 font-light relative py-2">
                                        {banner.mainText || ''}
                                    </div>
                                    <Link href={banner.pageLink} className="caption1 text-white font-semibold relative inline-block pb-1 border-b-2 border-white duration-500 mt-2">
                                        {banner.CTA || 'Shop Now'}
                                    </Link>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CatB_Banner;