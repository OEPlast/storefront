'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Rate from '@/components/Other/Rate';
import { useReviewLike } from '@/hooks/mutations/useReviewLike';
import toast from 'react-hot-toast';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { HandsClappingIcon } from '@phosphor-icons/react';

interface ReviewItemProps {
    review: {
        _id: string;
        reviewBy: {
            firstName: string;
            lastName: string;
        };
        rating: number;
        createdAt: string;
        message?: string;
        review?: string;
        images?: string[];
        likesCount?: number;
        isLikedByUser?: boolean;
    };
    productId: string;
}

export default function ReviewItem({ review, productId }: ReviewItemProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { openLoginModal } = useLoginModalStore();

    // Optimistic state for like
    const [optimisticLikesCount, setOptimisticLikesCount] = useState(review.likesCount || 0);
    const [optimisticIsLiked, setOptimisticIsLiked] = useState(review.isLikedByUser || false);
    const [isLiking, setIsLiking] = useState(false);

    const toggleLike = useReviewLike({
        onSuccess: () => {
            setIsLiking(false);
            toast.success(optimisticIsLiked ? 'Review liked!' : 'Like removed');
        },
        onError: (error) => {
            console.log(error);

            setIsLiking(false);
            // Revert optimistic update on error
            setOptimisticLikesCount(review.likesCount || 0);
            setOptimisticIsLiked(review.isLikedByUser || false);

            if (error.message === 'AUTHENTICATION_REQUIRED') {
                toast.error('Please login to like reviews');
                openLoginModal();
            } else {
                toast.error('Failed to update like. Please try again.');
            }
        },
    });

    const handleLikeClick = () => {
        if (!session?.user) {
            toast.error('Please login to like reviews');
            openLoginModal();
            return;
        }

        if (isLiking) return;

        setIsLiking(true);

        // Optimistic update
        const newIsLiked = !optimisticIsLiked;
        const newLikesCount = newIsLiked ? optimisticLikesCount + 1 : optimisticLikesCount - 1;

        setOptimisticIsLiked(newIsLiked);
        setOptimisticLikesCount(newLikesCount);

        // Make API call with current like state (before optimistic update)
        toggleLike.mutate({
            reviewId: review._id,
            productId,
            isCurrentlyLiked: optimisticIsLiked
        });
    };

    return (
        <div className="item border-b border-b-gray-50 pb-4">
            <div className="heading flex items-center justify-between">
                <div className="user-infor flex gap-3">
                    <div className="avatar">
                        <Icon.UserCircle size={32} weight="thin" />
                    </div>
                    <div className="user">
                        <div className="flex items-center gap-2">
                            <div className="text-title">{review.reviewBy.firstName} {review.reviewBy.lastName}</div>
                            <div className="span text-line">-</div>
                            <Rate currentRate={review.rating} size={12} />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-secondary2">
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-3">{review.message || review.review}</div>
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
                    <button
                        className={`like-btn flex items-center gap-1 cursor-pointer transition-colors ${optimisticIsLiked ? 'text-black' : 'text-gray-500 hover:text-black hover:scale-105'
                            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleLikeClick}
                        disabled={isLiking}
                    >
                        <HandsClappingIcon
                            size={18}
                            weight={optimisticIsLiked ? 'fill' : 'regular'}
                        />
                        <div className="text-button">{optimisticLikesCount}</div>
                    </button>
                </div>
            </div>
        </div>
    );
}
