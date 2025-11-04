'use client'

import React, { Component } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css/bundle';
import 'swiper/css/effect-fade';
import { useAllBanners, useGroupedBanners } from '@/hooks/queries/useBanners';
import { getCdnUrl } from '@/libs/cdn-url';
import { usePathname } from 'next/navigation';


const SliderNine = () => {
    const isHomePage = usePathname();

    if (isHomePage !== '/') return null;
    const { data } = useGroupedBanners(isHomePage === '/');
    console.log('SliderNine banners data:', isHomePage === '/', data);
    const TopGroupBanners = data?.A || [];

    if (!data) return null;
    if (TopGroupBanners.length === 0) return null;


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
                                delay: 4000,
                            }}
                        >
                            {TopGroupBanners.map((banner, index) => (
                                <SwiperSlide key={banner._id}>
                                    {banner.fullImage ? (
                                        // Full image layout - text overlays on image
                                        <div className="slider-item h-full w-full relative bg-surface">
                                            <Image
                                                src={getCdnUrl(banner.imageUrl)}
                                                fill
                                                alt={banner.name}
                                                priority={index === 0}
                                                className='object-cover'
                                            />
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="text-content md:pl-16 pl-5 z-10 text-white">
                                                    {banner.headerText && (
                                                        <div className="text-sub-display sm">{banner.headerText}</div>
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
                                    ) : (
                                        // Constrained layout - text beside image
                                        <div className="slider-item h-full w-full flex items-center bg-surface relative">
                                            <div className="text-content md:pl-16 pl-5 basis-1/2">
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
                                            <div className="sub-img absolute xl:w-[33%] sm:w-[38%] w-[60%] xl:right-[100px] sm:right-[20px] -right-5 bottom-0">
                                                <Image
                                                    src={getCdnUrl(banner.imageUrl)}
                                                    width={2000}
                                                    height={1936}
                                                    alt={banner.name}
                                                    priority={index === 0}
                                                    className='w-full'
                                                />
                                            </div>
                                        </div>
                                    )}
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SliderNine