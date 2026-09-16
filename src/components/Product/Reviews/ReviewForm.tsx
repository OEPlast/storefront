'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { ExistingReview, OrderInfo } from '@/hooks/queries/useCanReviewProduct';
import { uploadImage } from '@/libs/uploadImage';
import { getCdnUrl } from '@/libs/cdn-url';

/** Must match Main-server `MAX_REVIEW_PHOTOS`. */
const MAX_PHOTOS = 4;

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
    const [images, setImages] = useState<string[]>(existingReview?.images ?? []);
    const [uploading, setUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const addPhotos = async (files: FileList | null) => {
        if (!files?.length) return;
        const room = MAX_PHOTOS - images.length;
        if (room <= 0) {
            setError(`You can add up to ${MAX_PHOTOS} photos`);
            return;
        }
        setError(null);
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const file of Array.from(files).slice(0, room)) {
                if (!file.type.startsWith('image/')) throw new Error('Photos only, please');
                uploaded.push((await uploadImage(file, 'reviews')).path);
            }
            setImages((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
        } catch (err) {
            setError((err as Error).message || 'Photo upload failed');
        } finally {
            setUploading(false);
        }
    };

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
                        images,
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
                        images,
                        transactionId: orderInfo.transactionId,
                        orderId: orderInfo.orderId,
                    }
                );

                if (response.data) {
                    setSuccess(true);
                    // Reset form
                    setFormData({ rating: 5, title: '', review: '' });
                    setImages([]);
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

                {/* Photos */}
                <div>
                    <span className="text-button mb-2 block">Photos (optional)</span>
                    <div className="flex flex-wrap gap-3">
                        {images.map((path) => (
                            <div key={path} className="relative h-20 w-20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getCdnUrl(path)} alt="" className="h-20 w-20 rounded-lg object-cover" />
                                <button
                                    type="button"
                                    aria-label="Remove photo"
                                    onClick={() => setImages((prev) => prev.filter((p) => p !== path))}
                                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white"
                                >
                                    <Icon.X size={12} weight="bold" />
                                </button>
                            </div>
                        ))}
                        {images.length < MAX_PHOTOS && (
                            <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-secondary hover:border-black hover:text-black ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                                {uploading ? <Icon.CircleNotch size={20} className="animate-spin" /> : <Icon.Camera size={22} />}
                                <span className="caption2">{uploading ? 'Uploading' : 'Add photo'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="sr-only"
                                    onChange={(e) => {
                                        void addPhotos(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        )}
                    </div>
                    <p className="caption1 mt-2 text-secondary">Up to {MAX_PHOTOS} photos of the product you received.</p>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={isSubmitting || uploading || formData.review.length < 10}
                        className={`button-main ${isSubmitting || uploading || formData.review.length < 10
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
