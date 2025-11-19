'use client';

import { memo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Rate from '@/components/Other/Rate';
import { useReviewsInfo } from '@/hooks/queries/useReviewsInfo';
import { useReviewFormStore } from '@/store/useReviewFormStore';
import { useCanReviewProduct } from '@/hooks/queries/useCanReviewProduct';
import { useLoginModalStore } from '@/store/useLoginModalStore';


const ReviewsStatistics = ({ productId }: { productId: string; }) => {
    const { data: session } = useSession();
    const { data, isFetching, isLoading } = useReviewsInfo({ productId });
    const { openReviewForm, showWarning } = useReviewFormStore();
    const { openLoginModal } = useLoginModalStore();

    // Check if user can review this product
    const { data: canReviewData } = useCanReviewProduct({
        productId,
        enabled: !!productId && !!session?.user,
    });

    const handleWriteReviewClick = (e: React.MouseEvent) => {
        e.preventDefault();

        if (!session?.user) {
            openLoginModal();
            return;
        }

        if (canReviewData?.canReview || canReviewData?.hasExistingReview) {
            // User can review or already has a review - open form
            openReviewForm();
            // Scroll to form
            document.getElementById('form-review')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            // User not eligible - show warning
            showWarning();
        }
    };

    if (isFetching || isLoading || !data) return null;
    // Calculate percentages for each star rating
    const getPercentage = (count: number) => {
        if (data.totalRatings === 0) return 0;
        return Math.round((count / data.totalRatings) * 100);
    };

    return (
        <div className={`top-overview flex max-sm:flex-col items-center justify-between gap-12 gap-y-4`}>
            <div className="left flex max-sm:flex-col gap-y-4 gap-x-8 items-center lg:w-1/2 sm:w-2/3 w-full sm:pr-5">
                <div className='rating black-start flex flex-col items-center'>
                    <div className="text-display">{data.averageRating.toFixed(1)}</div>
                    <Rate currentRate={data.averageRating} size={18} />
                    <div className='text-center whitespace-nowrap mt-1'>
                        ({data.totalRatings.toLocaleString()} {data.totalRatings === 1 ? 'Rating' : 'Ratings'})
                    </div>
                </div>
                <div className="list-rating w-full md:w-2/3">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = data.starDistribution[star as keyof typeof data.starDistribution];
                        const percentage = getPercentage(count);

                        return (
                            <div key={star} className={`item flex items-center justify-start gap-1.5 ${star !== 5 ? 'mt-1' : ''}`}>
                                <div className="flex items-center gap-1">
                                    <div className="caption1">{star}</div>
                                    <Icon.Star size={14} weight='fill' />
                                </div>
                                <div className="progress bg-line relative w-3/4 h-2">
                                    <div
                                        className="progress-percent absolute bg-yellow h-full left-0 top-0"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="caption1">{percentage}%</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="right">
                <button
                    onClick={handleWriteReviewClick}
                    className='button-main bg-white text-black border border-black whitespace-nowrap'
                >
                    Write Reviews
                </button>
            </div>
        </div>
    );
};

export default ReviewsStatistics;
