'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCanReviewProduct } from '@/hooks/queries/useCanReviewProduct';
import { useReviewFormStore } from '@/store/useReviewFormStore';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Rate from '@/components/Other/Rate';
import ReviewForm from './ReviewForm';

interface AddReviewSectionProps {
  productId: string;
}

export default function AddReviewSection({ productId }: AddReviewSectionProps) {
  const { openLoginModal } = useLoginModalStore();
  const { data: session } = useSession();
  const { showReviewForm, showEligibilityWarning, openReviewForm, closeReviewForm } =
    useReviewFormStore();

  // Check if user can review this product
  const { data: canReviewData, isLoading: isCheckingEligibility } = useCanReviewProduct({
    productId,
    enabled: !!productId && !!session?.user,
  });

  // Reset form state when component unmounts
  useEffect(() => {
    return () => {
      useReviewFormStore.getState().reset();
    };
  }, []);

  return (
    <div className="mt-8">
      {/* Not logged in - show login prompt */}
      {/* {!session?.user && (
                <div className="p-6 bg-gray-50 border border-line rounded-lg text-center">
                    <Icon.UserCircle size={48} className="mx-auto mb-3 text-gray-400" />
                    <h4 className="heading5 mb-2">Want to review this product?</h4>
                    <p className="text-secondary mb-4">Please log in to share your experience</p>
                    <button
                        onClick={() => openLoginModal()}
                        className="button-main bg-black text-white"
                    >
                        Log In to Review
                    </button>
                </div>
            )} */}

      {/* User can write a new review */}
      {session?.user && canReviewData?.canReview && canReviewData.orderInfo && (
        <div>
          {!showReviewForm ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon.CheckCircle size={24} weight="fill" className="text-green-600" />
                    <h4 className="heading5">You can review this product!</h4>
                  </div>
                  <p className="mb-3 text-secondary">Share your experience with other customers</p>
                  {canReviewData.orderInfo.attributes.length > 0 && (
                    <div className="text-sm text-green-700">
                      <span>Purchased variant: </span>
                      {canReviewData.orderInfo.attributes.map((attr, index) => (
                        <span key={index}>
                          {attr.name}: <strong>{attr.value}</strong>
                          {index < (canReviewData.orderInfo?.attributes.length || 0) - 1
                            ? ', '
                            : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openReviewForm()}
                  className="button-main whitespace-nowrap bg-black text-white"
                >
                  Write Review
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => closeReviewForm()}
                className="mb-4 flex items-center gap-2 text-secondary hover:text-black"
              >
                <Icon.X size={20} />
                Cancel
              </button>
              <ReviewForm
                productId={productId}
                orderInfo={canReviewData.orderInfo}
                onSuccess={() => closeReviewForm()}
              />
            </div>
          )}
        </div>
      )}

      {/* User already reviewed - show existing review with edit option */}
      {session?.user &&
        canReviewData?.hasExistingReview &&
        canReviewData.existingReview &&
        !showReviewForm && (
          <div
            className={`rounded-lg border p-6 ${
              canReviewData.canUpdate
                ? 'border-green-200 bg-green-50'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Icon.CheckCircle
                    size={24}
                    weight="fill"
                    className={canReviewData.canUpdate ? 'text-green-600' : 'text-blue-600'}
                  />
                  <h4 className="heading5">Your Review</h4>
                </div>

                {/* Show badge if user can update due to new purchase */}
                {canReviewData.canUpdate && canReviewData.orderInfo && (
                  <div className="mb-3 rounded border border-green-300 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-green-800">
                      <Icon.ShoppingBag size={18} weight="fill" />
                      <span className="text-sm font-semibold">You purchased this again!</span>
                    </div>
                    <p className="text-xs text-green-700">
                      You can update your review based on your new purchase
                    </p>
                    {canReviewData.orderInfo.attributes.length > 0 && (
                      <div className="mt-1 text-xs text-green-700">
                        <span>New variant: </span>
                        {canReviewData.orderInfo.attributes.map((attr, index) => (
                          <span key={index}>
                            {attr.name}: <strong>{attr.value}</strong>
                            {index < (canReviewData.orderInfo?.attributes.length || 0) - 1
                              ? ', '
                              : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2">
                  <Rate currentRate={canReviewData.existingReview.rating} size={16} />
                  <span className="text-sm text-secondary">
                    {new Date(canReviewData.existingReview.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {canReviewData.existingReview.title && (
                  <h5 className="mb-1 font-semibold">{canReviewData.existingReview.title}</h5>
                )}
                <p className="text-secondary">{canReviewData.existingReview.review}</p>
                <div className="mt-3 flex items-center gap-4 text-sm text-secondary">
                  <span>👍 {canReviewData.existingReview.likesCount} likes</span>
                  <span>💬 {canReviewData.existingReview.repliesCount} replies</span>
                </div>
              </div>
              <button
                onClick={() => openReviewForm()}
                className={`ml-4 whitespace-nowrap ${
                  canReviewData.canUpdate
                    ? 'button-main bg-green-600 text-white hover:bg-green-700'
                    : 'button-main border border-black bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                {canReviewData.canUpdate ? 'Update Review' : 'Edit Review'}
              </button>
            </div>
          </div>
        )}

      {/* User already reviewed and wants to edit */}
      {session?.user &&
        canReviewData?.hasExistingReview &&
        canReviewData.existingReview &&
        showReviewForm && (
          <div>
            <button
              onClick={() => closeReviewForm()}
              className="mb-4 flex items-center gap-2 text-secondary hover:text-black"
            >
              <Icon.X size={20} />
              Cancel Edit
            </button>
            <ReviewForm
              productId={productId}
              existingReview={canReviewData.existingReview}
              orderInfo={canReviewData.canUpdate ? canReviewData.orderInfo : undefined}
              onSuccess={() => closeReviewForm()}
            />
          </div>
        )}

      {/* User not eligible to review - show only when warning is triggered */}
      {session?.user &&
        showEligibilityWarning &&
        !canReviewData?.canReview &&
        !canReviewData?.hasExistingReview &&
        canReviewData?.reason && (
          <div className="animate-fade-in flex flex-wrap justify-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-center">
            <Icon.Info size={22} className="text-yellow-700" />
            <p className="text-secondary">{canReviewData.reason}</p>
          </div>
        )}
    </div>
  );
}
