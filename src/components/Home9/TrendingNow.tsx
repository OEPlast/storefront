'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css/bundle';
import { useRouter } from 'next/navigation';
import { useTopCategories } from '@/hooks/queries/useProducts';
import { getCdnUrl } from '@/libs/cdn-url';


const TrendingNow = () => {
    const { data: TopCategories, isLoading } = useTopCategories()
    console.log(TopCategories);


    if (isLoading) {
        return (
            <div className="trending-block style-nine md:pt-20 pt-10">
                <div className="container">
                    <div className="heading3 text-center">Trending Right Now</div>
                    <div className="text-center mt-6">Loading...</div>
                </div>
            </div>
        );
    }

    if (!TopCategories || TopCategories.length === 0) {
        return null;
    }

    return (
        <>
            <div className="trending-block style-nine md:pt-20 pt-10">
                <div className="container">
                    <div className="heading3 text-center">Trending Right Now
                    </div>
                    <div className="list-trending section-swiper-navigation style-small-border style-center style-outline md:mt-10 mt-6">
                        <Swiper
                            spaceBetween={12}
                            slidesPerView={2}
                            navigation
                            virtual={typeof window !== "undefined" ? false : true}
                            loop={true}
                            modules={[Navigation, Autoplay]}
                            breakpoints={{
                                576: {
                                    slidesPerView: 3,
                                    spaceBetween: 12,
                                },
                                768: {
                                    slidesPerView: 4,
                                    spaceBetween: 20,
                                },
                                992: {
                                    slidesPerView: 5,
                                    spaceBetween: 20,
                                },
                                1290: {
                                    slidesPerView: 5,
                                    spaceBetween: 30,
                                },
                            }}
                            className='h-full'
                        >
                            {TopCategories.map((category) => (
                                <SwiperSlide key={category._id}>
                                    <Link href={`/category/${category.slug}`}
                                        className="trending-item block relative cursor-pointer"
                                    >
                                        <div className="bg-img rounded-2xl overflow-hidden border">
                                            <Image
                                                src={category.image ? getCdnUrl(category.image) : '/images/avatar/1.png'}
                                                width={1000}
                                                height={1000}
                                                alt={category.name}
                                                priority={true}
                                                className='w-full h-[160px] object-cover object-top'
                                            />
                                        </div>
                                        <div className="trending-name bg-white absolute bottom-5 left-1/2 -translate-x-1/2 w-[85%] text-center h-10 rounded-xl flex items-center justify-center duration-500 hover:bg-black hover:text-white">
                                            <span className='text-base'>{category.name}</span>
                                        </div>
                                    </Link>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </>
    )
}

export default TrendingNow