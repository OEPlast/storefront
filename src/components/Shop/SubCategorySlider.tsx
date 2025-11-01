'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Grid } from 'swiper/modules';
import 'swiper/css/bundle';
import 'swiper/css/grid';
import Link from 'next/link';

interface SubCategory {
    name: string;
    image: string;
    slug: string;
}

interface Props {
    categories: SubCategory[];
    activeCategory: string | null;
    onCategoryClick: (category: string) => void;
}

const SubCategorySlider: React.FC<Props> = ({ categories, activeCategory, onCategoryClick }) => {
    if (categories.length === 0) {
        return null;
    }
    return (
        <div className="sub-category-slider w-full mt-8 mb-4">
            <style jsx global>{`
                .sub-category-slider .swiper-button-next,
                .sub-category-slider .swiper-button-prev {
                    width: 40px;
                    height: 40px;
                    background: white;
                    border: 1px solid #e5e5e5;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                }
                
                .sub-category-slider .swiper-button-next:after,
                .sub-category-slider .swiper-button-prev:after {
                    font-size: 16px;
                    font-weight: bold;
                    color: black;
                    transition: color 0.3s ease;
                }
                
                .sub-category-slider .swiper-button-next:hover,
                .sub-category-slider .swiper-button-prev:hover {
                    background: black;
                    border-color: black;
                }
                
                .sub-category-slider .swiper-button-next:hover:after,
                .sub-category-slider .swiper-button-prev:hover:after {
                    color: white;
                }
                
                .sub-category-slider .swiper-button-disabled {
                   display:none;
                    cursor: not-allowed;
                }
            `}</style>
            <Swiper
                initialSlide={0}
                slidesPerView={3}
                spaceBetween={20}
                grid={{
                    rows: 1,
                    fill: 'row',
                }}
                loop={false}
                modules={[Autoplay, Navigation, Grid]}
                autoplay={false}
                navigation={true}
                virtual={typeof window !== "undefined" ? false : true}
                breakpoints={{
                    640: {
                        slidesPerView: 4,
                        spaceBetween: 20,
                        grid: {
                            rows: 1,
                            fill: 'row',
                        },
                    },
                    768: {
                        slidesPerView: 5,
                        spaceBetween: 24,
                        grid: {
                            rows: 2,
                            fill: 'row',
                        },
                    },
                    1024: {
                        slidesPerView: 5,
                        spaceBetween: 28,
                        grid: {
                            rows: 2,
                            fill: 'row',
                        },
                    },
                    1280: {
                        slidesPerView: 6,
                        spaceBetween: 32,
                        grid: {
                            rows: 2,
                            fill: 'row',
                        },
                    },
                    1536: {
                        slidesPerView: 7,
                        spaceBetween: 36,
                        grid: {
                            rows: 2,
                            fill: 'row',
                        },
                    },
                }}
            >
                {categories.map((category, index) => (
                    <SwiperSlide key={index}>
                        <Link
                            className={`category-item flex flex-col items-center cursor-pointer group ${activeCategory === category.slug ? 'active' : ''
                                }`}
                            href={`/shop/${category.slug}`}
                        >
                            <div
                                className={`image-wrapper relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 transition-all duration-300 ${activeCategory === category.slug
                                    ? 'border-black scale-110'
                                    : 'border-line group-hover:border-gray-400 group-hover:scale-105'
                                    }`}
                            >
                                <Image
                                    src={category.image}
                                    alt={category.name}
                                    width={100}
                                    height={100}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div
                                className={`category-name text-center mt-1 md:mt-2 text-xs sm:text-sm md:text-base transition-colors duration-300 ${activeCategory === category.slug
                                    ? 'font-semibold text-black'
                                    : 'text-secondary group-hover:text-black hover:underline transition-all'
                                    }`}
                            >
                                {category.name}
                            </div>
                        </Link>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default SubCategorySlider;
