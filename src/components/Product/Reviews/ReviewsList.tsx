'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useProductReviews } from '@/hooks/queries/useProductReviews';
import { useReviewLike } from '@/hooks/mutations/useReviewLike';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useReviewsInfo } from '@/hooks/queries/useReviewsInfo';
import Rate from '@/components/Other/Rate';
import Link from 'next/link';
import ReviewsStatistics from './ReviewsStatistics';


interface ReviewsListProps {
    productId: string;
    className?: string;
}

type SortOption = 'newest' | 'helpful' | 'rating-high' | 'rating-low' | '5star' | '4star' | '3star' | '2star' | '1star';

export default function ReviewsList({ productId, className = '' }: ReviewsListProps) {
    const router = useRouter();
    const { data: session } = useSession();
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

    // Like mutation
    const toggleLike = useReviewLike({
        onError: (error) => {
            if (error.message === 'AUTHENTICATION_REQUIRED') {
                router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
            }
        },
    });

    // Flatten all reviews from pages - each page has a 'data' property containing the reviews array
    const allReviews = data?.pages.flatMap((page) => page.data) || [];

    // Fetch review statistics for displaying total count
    const { data: reviewsInfo } = useReviewsInfo({ productId });

    // Handle like click
    const handleLikeClick = (reviewId: string) => {
        if (!session?.user) {
            router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }
        toggleLike.mutate({ reviewId, productId });
    };

    // Render stars
    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Icon.Star
                        key={star}
                        className={`text-sm ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                        weight={star <= rating ? 'fill' : 'regular'}
                    />
                ))}
            </div>
        );
    };

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
            <div className="mt-8">
                <div className="heading flex items-center justify-between flex-wrap gap-4">
                    <div className="heading4">
                        {reviewsInfo?.totalRatings || 0} Comment{(reviewsInfo?.totalRatings || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="right flex items-center gap-3">
                        <label htmlFor='select-filter' className="uppercase">Sort by:</label>
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
                            {allReviews.map((review) => (
                                <div key={review._id} className={`item ${allReviews.indexOf(review) > 0 ? 'mt-8' : ''}`}>
                                    <div className="heading flex items-center justify-between">
                                        <div className="user-infor flex gap-4">
                                            <div className="avatar">
                                                <Icon.UserCircle size={52} weight="thin" />
                                            </div>
                                            <div className="user">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-title">{review.reviewBy.firstName} {review.reviewBy.lastName}</div>
                                                    <div className="span text-line">-</div>
                                                    <Rate currentRate={review.rating} size={12} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-secondary2">
                                                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="more-action cursor-pointer">
                                            <Icon.DotsThree size={24} weight='bold' />
                                        </div>
                                    </div>
                                    <div className="mt-3">{review.message}</div>
                                    {review.images && review.images.length > 0 && (
                                        <div className="list-img flex items-center gap-2 mt-3 flex-wrap">
                                            {review.images.map((img, imgIndex) => (
                                                <Image
                                                    key={imgIndex}
                                                    src={img}
                                                    width={400}
                                                    height={400}
                                                    alt={`review-img-${imgIndex}`}
                                                    className='w-[100px] aspect-square object-cover rounded-lg'
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className="action mt-3">
                                        <div className="flex items-center gap-4">
                                            <div className="like-btn flex items-center gap-1 cursor-pointer">
                                                <Icon.HandsClapping size={18} />
                                                <div className="text-button">{review.likesCount || 0}</div>
                                            </div>
                                        </div>
                                    </div>
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
/*
                <div id="form-review" className='form-review pt-6'>
                    <div className="heading4">Leave A comment</div>
                    <form className="grid sm:grid-cols-2 gap-4 gap-y-5 md:mt-6 mt-3">
                        <div className="name ">
                            <input className="border-line px-4 pt-3 pb-3 w-full rounded-lg" id="username" type="text" placeholder="Your Name *" required />
                        </div>
                        <div className="mail ">
                            <input className="border-line px-4 pt-3 pb-3 w-full rounded-lg" id="email" type="email" placeholder="Your Email *" required />
                        </div>
                        <div className="col-span-full message">
                            <textarea className="border border-line px-4 py-3 w-full rounded-lg" id="message" name="message" placeholder="Your message *" required ></textarea>
                        </div>
                        <div className="col-span-full flex items-start -mt-2 gap-2">
                            <input type="checkbox" id="saveAccount" name="saveAccount" className='mt-1.5' />
                            <label className="" htmlFor="saveAccount">Save my name, email, and website in this browser for the next time I comment.</label>
                        </div>
                        <div className="col-span-full sm:pt-3">
                            <button className='button-main bg-white text-black border border-black'>Submit Reviews</button>
                        </div>
                    </form>
                </div>
*/