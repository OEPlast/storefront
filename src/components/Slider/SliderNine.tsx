'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css/bundle';
import 'swiper/css/effect-fade';
import { useGroupedBanners } from '@/hooks/queries/useBanners';
import { usePathname } from 'next/navigation';
import FullImageSlide from './FullImageSlide';
import HalfImageSlide from './HalfImageSlide';

const SliderNine = () => {
  const isHomePage = usePathname();

  const { data } = useGroupedBanners(isHomePage === '/');
  if (isHomePage !== '/') return null;
  const TopGroupBanners = data?.A || [];

  if (!data) return null;
  if (TopGroupBanners.length === 0) return null;

  return (
    <>
      <div className="slider-block style-nine h-[280px] w-full sm:h-[320px] md:h-[400px] lg:h-[500px]">
        <div className="container flex h-full w-full justify-end lg:pt-2">
          <div className="slider-main h-full w-full lg:pl-5">
            <Swiper
              spaceBetween={0}
              slidesPerView={1}
              loop={true}
              pagination={{ clickable: true }}
              modules={[Pagination, Autoplay]}
              className="relative h-full overflow-hidden rounded-2xl"
              autoplay={{
                delay: 5000,
              }}
            >
              {TopGroupBanners.map((banner, index) => (
                <SwiperSlide key={banner._id}>
                  {/* Show FullImageSlide on small screens, hide on larger */}
                  <div className="block h-full w-full sm:hidden">
                    <FullImageSlide banner={banner} priority={index === 0} />
                  </div>

                  {/* On larger screens, show based on banner.fullImage */}
                  <div className="hidden h-full w-full sm:block">
                    {banner.fullImage ? (
                      <FullImageSlide banner={banner} priority={index === 0} />
                    ) : (
                      <HalfImageSlide banner={banner} priority={index === 0} />
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </>
  );
};

export default SliderNine;
