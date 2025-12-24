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

    TopGroupBanners.splice(1, 2)

    return (
        <>
            <div className="slider-block style-nine lg:h-[480px] md:h-[400px] sm:h-[320px] h-[280px] w-full">
                <div className="container lg:pt-5 flex justify-end h-full w-full">
                    <div className="slider-main lg:pl-5 h-full w-full">
                        <Swiper
                            spaceBetween={0}
                            slidesPerView={1}
                            loop={true}
                            pagination={{ clickable: true }}
                            modules={[Pagination, Autoplay]}
                            className='h-full relative rounded-2xl overflow-hidden'
                            autoplay={{
                                delay: 5000,
                            }}
                        >
                            {TopGroupBanners.map((banner, index) => (
                                <SwiperSlide key={banner._id}>
                                    {/* Show FullImageSlide on small screens, hide on larger */}
                                    <div className="block sm:hidden h-full w-full">
                                        <FullImageSlide banner={banner} priority={index === 0} />
                                    </div>

                                    {/* On larger screens, show based on banner.fullImage */}
                                    <div className="hidden sm:block h-full w-full">
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