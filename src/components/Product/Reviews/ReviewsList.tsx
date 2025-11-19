'use client';

import { useState } from 'react';
import { useProductReviews } from '@/hooks/queries/useProductReviews';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useReviewsInfo } from '@/hooks/queries/useReviewsInfo';
import ReviewsStatistics from './ReviewsStatistics';
import AddReviewSection from './AddReviewSection';
import ReviewItem from './ReviewItem';


interface ReviewsListProps {
    productId: string;
    className?: string;
}

type SortOption = 'newest' | 'helpful' | 'rating-high' | 'rating-low' | '5star' | '4star' | '3star' | '2star' | '1star';

export default function ReviewsList({ productId, className = '' }: ReviewsListProps) {
    const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
    const [hasImages, setHasImages] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    // Fetch reviews with filters
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
    } = useProductReviews({
        productId,
        limit: 10,
        filters: {
            rating: selectedRating as 1 | 2 | 3 | 4 | 5 | undefined,
            hasImages,
            sortBy,
        },
    });

    // Flatten all reviews from pages - each page has a 'data' property containing the reviews array
    const allReviews = data?.pages.flatMap((page) => page.data) || [];

    // Fetch review statistics for displaying total count
    const { data: reviewsInfo } = useReviewsInfo({ productId });

    if (isLoading) {
        return (
            <div className={`${className}`}>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className}`}>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <strong>Error loading reviews:</strong> {error.message}
                </div>
            </div>
        );
    }

    return (
        <>
            {<ReviewsStatistics productId={productId} />}

            {/* Review Form Section */}
            <AddReviewSection productId={productId} />

            <div className="mt-8">
                <div className="heading flex items-center justify-between flex-wrap gap-4">
                    <div className="heading4">
                        {reviewsInfo?.totalRatings || 0} Comment{(reviewsInfo?.totalRatings || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="right flex items-center gap-3">
                        <label htmlFor='select-filter' className="uppercase hidden md:block">Sort by:</label>
                        <div className="select-block relative">
                            <select
                                id="select-filter"
                                name="select-filter"
                                className='text-button py-2 pl-3 md:pr-14 pr-10 rounded-lg bg-white border border-line'
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                            >
                                <option value="newest">Newest</option>
                                <option value="5star">5 Star</option>
                                <option value="4star">4 Star</option>
                                <option value="3star">3 Star</option>
                                <option value="2star">2 Star</option>
                                <option value="1star">1 Star</option>
                            </select>
                            <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                        </div>
                    </div>
                </div>
                <div className="list-review mt-6">
                    {isLoading ? (
                        <div className="text-center py-10">Loading reviews...</div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-600">
                            Error loading reviews. Please try again later.
                        </div>
                    ) : allReviews && allReviews.length > 0 ? (
                        <>
                            {allReviews.map((review, index) => (
                                <div key={review._id} className={index > 0 ? 'mt-8' : ''}>
                                    <ReviewItem
                                        review={review}
                                        productId={productId}
                                    />
                                </div>
                            ))}

                            {hasNextPage && (
                                <div className="flex justify-center mt-8">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="button-main bg-white text-black border border-black hover:bg-black hover:text-white px-8 py-3 rounded-lg"
                                    >
                                        {isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-10 text-secondary">
                            No reviews yet. Be the first to review this product!
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
