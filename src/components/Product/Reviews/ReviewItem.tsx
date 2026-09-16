'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Rate from '@/components/Other/Rate';
import { useReviewLike } from '@/hooks/mutations/useReviewLike';
import toast from 'react-hot-toast';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { HandsClappingIcon } from '@phosphor-icons/react';
import { getCdnUrl } from '@/libs/cdn-url';
import { useStoreConfig } from '@/context/StoreConfigContext';

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
    /** Staff replies, shown as the store's response. */
    replies?: Array<{ _id: string; reply: string; createdAt: string }>;
  };
  productId: string;
}

export default function ReviewItem({ review, productId }: ReviewItemProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { openLoginModal } = useLoginModalStore();
  const { storeName } = useStoreConfig();

  // Optimistic state for like
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(review.likesCount || 0);
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(review.isLikedByUser || false);

  // Re-sync when the server's like state changes (e.g. refetched after a popup login).
  // The optimistic cache update only touches likes/likesCount, so this never undoes a pending click.
  const [syncedIsLikedByUser, setSyncedIsLikedByUser] = useState(review.isLikedByUser);
  if (review.isLikedByUser !== syncedIsLikedByUser) {
    setSyncedIsLikedByUser(review.isLikedByUser);
    setOptimisticIsLiked(review.isLikedByUser || false);
    setOptimisticLikesCount(review.likesCount || 0);
  }


  const toggleLike = useReviewLike({
    onSuccess: () => {
      toast.success(optimisticIsLiked ? 'Review liked!' : 'Like removed');
    },
    onError: (error) => {
      console.log(error);

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

    // Optimistic update
    const newIsLiked = !optimisticIsLiked;
    const newLikesCount = newIsLiked ? optimisticLikesCount + 1 : optimisticLikesCount - 1;

    setOptimisticIsLiked(newIsLiked);
    setOptimisticLikesCount(newLikesCount);

    // Make API call with current like state (before optimistic update)
    toggleLike.mutate({
      reviewId: review._id,
      productId,
      isCurrentlyLiked: optimisticIsLiked,
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
              <div className="text-title">
                {review.reviewBy.firstName} {review.reviewBy.lastName}
              </div>
              <div className="span text-line">-</div>
              <Rate currentRate={review.rating} size={12} />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-secondary2">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3">{review.message || review.review}</div>
      {review.images && review.images.length > 0 && (
        <div className="list-img mt-3 flex flex-wrap items-center gap-2">
          {review.images.map((img, imgIndex) => (
            <a key={imgIndex} href={getCdnUrl(img)} target="_blank" rel="noopener noreferrer" aria-label={`Open photo ${imgIndex + 1}`}>
              <Image
                src={getCdnUrl(img) || '/images/placeholder.png'}
                width={400}
                height={400}
                alt={`Customer photo ${imgIndex + 1}`}
                className="aspect-square w-[100px] rounded-lg object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {review.replies && review.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {review.replies.map((reply) => (
            <div key={reply._id} className="rounded-lg bg-surface px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon.Storefront size={16} />
                Response from {storeName}
                <span className="font-normal text-secondary2">
                  · {new Date(reply.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-secondary">{reply.reply}</p>
            </div>
          ))}
        </div>
      )}
      <div className="action mt-3">
        <div className="flex items-center gap-4">
          <button
            className={`like-btn flex cursor-pointer items-center gap-1 transition-colors ${
              optimisticIsLiked ? 'text-black' : 'text-gray-500 hover:scale-105 hover:text-black'
            }`}
            onClick={handleLikeClick}
          >
            <HandsClappingIcon size={18} weight={optimisticIsLiked ? 'fill' : 'regular'} />
            <div className="text-button">{optimisticLikesCount}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
