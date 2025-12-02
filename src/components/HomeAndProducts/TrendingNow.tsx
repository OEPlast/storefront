'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css/bundle';
import { useRouter } from 'next/navigation';
import { useTopCategories } from '@/hooks/queries/useProducts';
import { getCdnUrl } from '@/libs/cdn-url';


const TrendingNow = () => {
    const { data: TopCategories, isLoading } = useTopCategories();


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
            <div className="trending-block style-six md:pt-20 pt-10 my-10">
                <div className="container">
                    <div className="heading3 text-center">Trending Right Now
                    </div>
                    <div className="list-trending section-swiper-navigation style-small-border style-outline md:mt-10 mt-6">
                        <Swiper
                            spaceBetween={12}
                            autoplay={{
                                delay: 8000,
                                disableOnInteraction: true,
                            }}
                            slidesPerView={2}
                            navigation
                            virtual={typeof window !== "undefined" ? false : true}
                            loop={true}
                            modules={[Navigation, Autoplay]}
                            breakpoints={{
                                306: {
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
                                    slidesPerView: 6,
                                    spaceBetween: 30,
                                },
                            }}
                            className='h-full'
                        >
                            {TopCategories.map((category) => (
                                <SwiperSlide key={category._id}>
                                    <Link href={`/category/${category.slug}`}
                                        className="trending-item block relative cursor-pointer group duration-200 transition-all"
                                    >
                                        <div className="bg-img rounded-full overflow-hidden border !aspect-square ">
                                            <Image
                                                src={category.image ? getCdnUrl(category.image) : '/images/avatar/1.png'}
                                                width={1000}
                                                height={1000}
                                                alt={category.name}
                                                priority={true}
                                                className='w-auto h-full object-cover object-top'
                                            />
                                        </div>
                                        <div className="trending-name text-center mt-5 duration-500">
                                            <span className='heading6 group-hover:underline font-medium'>{category.name}</span>
                                            {/* <span className='text-secondary'>{category.count}</span> */}
                                        </div>
                                    </Link>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TrendingNow;