'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { useGroupedBanners } from '@/hooks/queries/useBanners';
import { usePathname } from 'next/navigation';
import 'swiper/css/bundle';
import { getCdnUrl } from '@/libs/cdn-url';

const SliderOrganic = () => {
  const isHomePage = usePathname();

  const { data } = useGroupedBanners(isHomePage === '/');
  if (isHomePage !== '/') return null;
  const TopGroupBanners = data?.A || [];

  if (!data) return null;
  if (TopGroupBanners.length === 0) return null;

  return (
    <>
      <div className="slider-block style-two bg-linear h-[420px] w-full sm:h-[500px] md:h-[580px] lg:h-[680px] xl:h-[740px] 2xl:h-[820px]">
        <div className="slider-main h-full w-full">
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            loop={true}
            pagination={{ clickable: true }}
            modules={[Pagination, Autoplay]}
            className="relative h-full"
            autoplay={{
              delay: 40000,
            }}
          >
            {TopGroupBanners.map((banner) => (
              <SwiperSlide key={banner._id}>
                <div className="slider-item relative h-full w-full">
                  <div className="container flex h-full w-full items-center">
                    <div className="text-content w-2/3 sm:w-1/2">
                      <div className="text-sub-display">{banner.supportingText || 'Sale! Up To 50% Off!'}</div>
                      <div className="text-display mt-2 md:mt-5">
                        {banner.headerText}
                      </div>
                      <div className="body1 mt-4">{banner.mainText}</div>
                      <Link
                        href={banner.pageLink}
                        className="button-main mt-3 text-white md:mt-8"
                        style={{ backgroundColor: banner.ctaColor || '#000000' }}
                      >
                        {banner.CTA}
                      </Link>
                    </div>
                    <div className="sub-img absolute left-0 top-0 z-[-1] h-full w-full">
                      <Image
                        src={getCdnUrl(banner.imageUrl)}
                        width={4000}
                        height={3000}
                        // fill
                        alt={banner.name}
                        priority={true}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </>
  );
};

export default SliderOrganic;
