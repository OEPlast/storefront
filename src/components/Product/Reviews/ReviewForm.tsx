'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { ExistingReview, OrderInfo } from '@/hooks/queries/useCanReviewProduct';

interface ReviewFormProps {
    productId: string;
    orderInfo?: OrderInfo;
    existingReview?: ExistingReview;
    onSuccess?: () => void;
}

export default function ReviewForm({ productId, orderInfo, existingReview, onSuccess }: ReviewFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEditing = !!existingReview;

    const [formData, setFormData] = useState({
        rating: existingReview?.rating || 5,
        title: existingReview?.title || '',
        review: existingReview?.review || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRatingChange = (rating: number) => {
        setFormData(prev => ({ ...prev, rating }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validation
        if (formData.rating < 1 || formData.rating > 5) {
            setError('Please select a rating between 1 and 5 stars');
            return;
        }

        if (formData.review.length < 10) {
            setError('Review must be at least 10 characters long');
            return;
        }

        if (formData.review.length > 1000) {
            setError('Review must not exceed 1000 characters');
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && existingReview) {
                // Update existing review
                const response = await apiClient.put(
                    api.reviews.update(existingReview._id),
                    {
                        rating: formData.rating,
                        title: formData.title,
                        review: formData.review,
                    }
                );

                if (response.data) {
                    setSuccess(true);
                    // Invalidate queries to refresh the reviews list
                    queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
                    queryClient.invalidateQueries({ queryKey: ['reviews-info', productId] });
                    queryClient.invalidateQueries({ queryKey: ['can-review', productId] });

                    if (onSuccess) onSuccess();
                }
            } else if (orderInfo) {
                // Create new review
                const response = await apiClient.post(
                    api.reviews.create,
                    {
                        product: productId,
                        rating: formData.rating,
                        title: formData.title,
                        review: formData.review,
                        transactionId: orderInfo.transactionId,
                        orderId: orderInfo.orderId,
                    }
                );

                if (response.data) {
                    setSuccess(true);
                    // Reset form
                    setFormData({ rating: 5, title: '', review: '' });
                    // Invalidate queries to refresh the reviews list
                    queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
                    queryClient.invalidateQueries({ queryKey: ['reviews-info', productId] });
                    queryClient.invalidateQueries({ queryKey: ['can-review', productId] });

                    if (onSuccess) onSuccess();
                }
            }
        } catch (err) {
            const errorMessage = handleApiError(err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="form-review pt-6 border-t border-line">
            <div className="heading4 mb-4">
                {isEditing ? 'Update Your Review' : 'Leave A Review'}
            </div>

            {/* Order Info Display for new review */}
            {orderInfo && !isEditing && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                        <Icon.CheckCircle size={20} weight="fill" />
                        <span className="font-semibold">Verified Purchase</span>
                    </div>
                    {orderInfo.attributes.length > 0 && (
                        <div className="mt-2 text-sm text-green-700">
                            <span>You purchased: </span>
                            {orderInfo.attributes.map((attr, index) => (
                                <span key={index}>
                                    {attr.name}: <strong>{attr.value}</strong>
                                    {index < orderInfo.attributes.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                            {orderInfo.qty > 1 && <span> (Qty: {orderInfo.qty})</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Order Info Display when editing with new purchase */}
            {orderInfo && isEditing && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                        <Icon.ShoppingBag size={20} weight="fill" />
                        <span className="font-semibold">New Purchase Detected</span>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                        You&apos;ve purchased this product again! Update your review based on your latest experience.
                    </p>
                    {orderInfo.attributes.length > 0 && (
                        <div className="text-sm text-green-700">
                            <span>Latest purchase: </span>
                            {orderInfo.attributes.map((attr, index) => (
                                <span key={index}>
                                    {attr.name}: <strong>{attr.value}</strong>
                                    {index < orderInfo.attributes.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                            {orderInfo.qty > 1 && <span> (Qty: {orderInfo.qty})</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <div className="flex items-center gap-2">
                        <Icon.CheckCircle size={20} weight="fill" />
                        <span>
                            {isEditing ? 'Review updated successfully!' : 'Review submitted successfully!'}
                        </span>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <div className="flex items-center gap-2">
                        <Icon.WarningCircle size={20} weight="fill" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Rating */}
                <div>
                    <label className="text-button mb-2 block">Rating *</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => handleRatingChange(star)}
                                className="focus:outline-none transition-colors"
                            >
                                <Icon.Star
                                    size={32}
                                    weight={star <= formData.rating ? 'fill' : 'regular'}
                                    className={star <= formData.rating ? 'text-yellow-500' : 'text-gray-300'}
                                />
                            </button>
                        ))}
                        <span className="ml-2 text-secondary">{formData.rating}/5</span>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label htmlFor="review-title" className="text-button mb-2 block">
                        Review Title (Optional)
                    </label>
                    <input
                        id="review-title"
                        type="text"
                        className="border-line px-4 py-3 w-full rounded-lg"
                        placeholder="Summarize your experience (max 100 characters)"
                        maxLength={100}
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                {/* Review Text */}
                <div>
                    <label htmlFor="review-message" className="text-button mb-2 block">
                        Your Review *
                    </label>
                    <textarea
                        id="review-message"
                        className="border border-line px-4 py-3 w-full rounded-lg min-h-[150px]"
                        placeholder="Share your thoughts about this product (10-1000 characters)"
                        required
                        minLength={10}
                        maxLength={1000}
                        value={formData.review}
                        onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
                    />
                    <div className="text-right text-sm text-secondary mt-1">
                        {formData.review.length}/1000 characters
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={isSubmitting || formData.review.length < 10}
                        className={`button-main ${isSubmitting || formData.review.length < 10
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                    >
                        {isSubmitting
                            ? isEditing
                                ? 'Updating...'
                                : 'Submitting...'
                            : isEditing
                                ? 'Update Review'
                                : 'Submit Review'}
                    </button>
                </div>
            </form>
        </div>
    );
}
