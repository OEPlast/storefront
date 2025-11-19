'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCanReviewProduct } from '@/hooks/queries/useCanReviewProduct';
import { useReviewFormStore } from '@/store/useReviewFormStore';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Rate from '@/components/Other/Rate';
import ReviewForm from './ReviewForm';

interface AddReviewSectionProps {
    productId: string;
}

export default function AddReviewSection({ productId }: AddReviewSectionProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const { showReviewForm, showEligibilityWarning, openReviewForm, closeReviewForm } = useReviewFormStore();

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
            {!session?.user && (
                <div className="p-6 bg-gray-50 border border-line rounded-lg text-center">
                    <Icon.UserCircle size={48} className="mx-auto mb-3 text-gray-400" />
                    <h4 className="heading5 mb-2">Want to review this product?</h4>
                    <p className="text-secondary mb-4">Please log in to share your experience</p>
                    <button
                        onClick={() => router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))}
                        className="button-main bg-black text-white"
                    >
                        Log In to Review
                    </button>
                </div>
            )}

            {/* User can write a new review */}
            {session?.user && canReviewData?.canReview && canReviewData.orderInfo && (
                <div>
                    {!showReviewForm ? (
                        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon.CheckCircle size={24} weight="fill" className="text-green-600" />
                                        <h4 className="heading5">You can review this product!</h4>
                                    </div>
                                    <p className="text-secondary mb-3">
                                        Share your experience with other customers
                                    </p>
                                    {canReviewData.orderInfo.attributes.length > 0 && (
                                        <div className="text-sm text-green-700">
                                            <span>Purchased variant: </span>
                                            {canReviewData.orderInfo.attributes.map((attr, index) => (
                                                <span key={index}>
                                                    {attr.name}: <strong>{attr.value}</strong>
                                                    {index < (canReviewData.orderInfo?.attributes.length || 0) - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => openReviewForm()}
                                    className="button-main bg-black text-white whitespace-nowrap"
                                >
                                    Write Review
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={() => closeReviewForm()}
                                className="flex items-center gap-2 text-secondary hover:text-black mb-4"
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
            {session?.user && canReviewData?.hasExistingReview && canReviewData.existingReview && !showReviewForm && (
                <div className={`p-6 border rounded-lg ${canReviewData.canUpdate
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                    }`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon.CheckCircle
                                    size={24}
                                    weight="fill"
                                    className={canReviewData.canUpdate ? 'text-green-600' : 'text-blue-600'}
                                />
                                <h4 className="heading5">Your Review</h4>
                            </div>

                            {/* Show badge if user can update due to new purchase */}
                            {canReviewData.canUpdate && canReviewData.orderInfo && (
                                <div className="mb-3 p-3 bg-white rounded border border-green-300">
                                    <div className="flex items-center gap-2 text-green-800 mb-1">
                                        <Icon.ShoppingBag size={18} weight="fill" />
                                        <span className="font-semibold text-sm">You purchased this again!</span>
                                    </div>
                                    <p className="text-xs text-green-700">
                                        You can update your review based on your new purchase
                                    </p>
                                    {canReviewData.orderInfo.attributes.length > 0 && (
                                        <div className="text-xs text-green-700 mt-1">
                                            <span>New variant: </span>
                                            {canReviewData.orderInfo.attributes.map((attr, index) => (
                                                <span key={index}>
                                                    {attr.name}: <strong>{attr.value}</strong>
                                                    {index < (canReviewData.orderInfo?.attributes.length || 0) - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-2">
                                <Rate currentRate={canReviewData.existingReview.rating} size={16} />
                                <span className="text-secondary text-sm">
                                    {new Date(canReviewData.existingReview.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                            {canReviewData.existingReview.title && (
                                <h5 className="font-semibold mb-1">{canReviewData.existingReview.title}</h5>
                            )}
                            <p className="text-secondary">{canReviewData.existingReview.review}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-secondary">
                                <span>👍 {canReviewData.existingReview.likesCount} likes</span>
                                <span>💬 {canReviewData.existingReview.repliesCount} replies</span>
                            </div>
                        </div>
                        <button
                            onClick={() => openReviewForm()}
                            className={`whitespace-nowrap ml-4 ${canReviewData.canUpdate
                                ? 'button-main bg-green-600 text-white hover:bg-green-700'
                                : 'button-main bg-white text-black border border-black hover:bg-black hover:text-white'
                                }`}
                        >
                            {canReviewData.canUpdate ? 'Update Review' : 'Edit Review'}
                        </button>
                    </div>
                </div>
            )}

            {/* User already reviewed and wants to edit */}
            {session?.user && canReviewData?.hasExistingReview && canReviewData.existingReview && showReviewForm && (
                <div>
                    <button
                        onClick={() => closeReviewForm()}
                        className="flex items-center gap-2 text-secondary hover:text-black mb-4"
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
            {session?.user && showEligibilityWarning && !canReviewData?.canReview && !canReviewData?.hasExistingReview && canReviewData?.reason && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center flex flex-wrap gap-1 justify-center animate-fade-in">
                    <Icon.Info size={22} className="text-yellow-700" />
                    <p className="text-secondary">{canReviewData.reason}</p>
                </div>
            )}
        </div>
    );
}
