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
      <div className="banner-block pt-10">
        <div className="container">
          <div
            className={`list-banner grid ${CAT_B_Banners.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-[10px]`}
          >
            {CAT_B_Banners.map((banner, index) => (
              <Link
                key={banner._id || index}
                href={banner.pageLink || '/shop/breadcrumb-img'}
                className={`banner-item relative block duration-500 ${index === 2 ? 'max-lg:hidden' : ''}`}
              >
                <div className="banner-img w-full overflow-hidden rounded-lg">
                  <Image
                    src={getCdnUrl(banner.imageUrl)}
                    width={600}
                    height={400}
                    alt={banner.name || 'banner'}
                    className="max-h-[470px] w-full duration-500"
                  />
                </div>
                <div className="banner-content absolute left-[30px] top-1/2 -translate-y-1/2">
                  <div className="heading3 max-w-[90%] whitespace-pre-line break-words text-white">
                    {banner.headerText || ''}
                  </div>
                  <div className="relative py-2 text-base font-light text-gray-100">
                    {banner.mainText || ''}
                  </div>
                  <div className="caption1 relative mt-2 inline-block border-b-2 border-white pb-1 font-semibold text-white duration-500">
                    {banner.CTA || 'Shop Now'}
                  </div>
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
