'use client';

import { memo } from 'react';
import Link from 'next/link';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Rate from '@/components/Other/Rate';
import { ReviewsInfo, useReviewsInfo } from '@/hooks/queries/useReviewsInfo';


const ReviewsStatistics = ({ productId }: { productId: string; }) => {
    const { data, isFetching, isLoading } = useReviewsInfo({ productId });

    if (isFetching || isLoading || !data) return null;
    // Calculate percentages for each star rating
    const getPercentage = (count: number) => {
        if (data.totalRatings === 0) return 0;
        return Math.round((count / data.totalRatings) * 100);
    };

    return (
        <div className={`top-overview flex max-sm:flex-col items-center justify-between gap-12 gap-y-4`}>
            <div className="left flex max-sm:flex-col gap-y-4 items-center justify-between lg:w-1/2 sm:w-2/3 w-full sm:pr-5">
                <div className='rating black-start flex flex-col items-center'>
                    <div className="text-display">{data.averageRating.toFixed(1)}</div>
                    <Rate currentRate={Math.round(data.averageRating)} size={18} />
                    <div className='text-center whitespace-nowrap mt-1'>
                        ({data.totalRatings.toLocaleString()} {data.totalRatings === 1 ? 'Rating' : 'Ratings'})
                    </div>
                </div>
                <div className="list-rating w-2/3">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = data.starDistribution[star as keyof typeof data.starDistribution];
                        const percentage = getPercentage(count);

                        return (
                            <div key={star} className={`item flex items-center justify-end gap-1.5 ${star !== 5 ? 'mt-1' : ''}`}>
                                <div className="flex items-center gap-1">
                                    <div className="caption1">{star}</div>
                                    <Icon.Star size={14} weight='fill' />
                                </div>
                                <div className="progress bg-line relative w-3/4 h-2">
                                    <div
                                        className="progress-percent absolute bg-black h-full left-0 top-0"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="caption1">{percentage}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* <div className="right">
                <Link href={'#form-review'} className='button-main bg-white text-black border border-black whitespace-nowrap'>
                    Write Reviews
                </Link>
            </div> */}
        </div>
    );
};

export default ReviewsStatistics;
