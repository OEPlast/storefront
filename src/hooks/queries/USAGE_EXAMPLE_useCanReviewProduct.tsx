// Example: Using useCanReviewProduct Hook in a Product Page Component

'use client';

import { useCanReviewProduct } from '@/hooks/queries/useCanReviewProduct';
import { useSession } from 'next-auth/react';

interface ProductReviewSectionProps {
  productId: string;
}

export default function ProductReviewSection({ productId }: ProductReviewSectionProps) {
  const { data: session } = useSession();

  // Check if user can review this product
  const { data: canReviewData, isLoading } = useCanReviewProduct({
    productId,
    enabled: !!productId, // Only run when productId exists
  });

  if (isLoading) {
    return <div>Checking review eligibility...</div>;
  }

  // Case 1: User can review (eligible)
  if (canReviewData?.canReview && canReviewData.orderInfo) {
    return (
      <div className="review-form-section">
        <h3>Write a Review</h3>
        <p>You purchased this product!</p>
        <p>Quantity: {canReviewData.orderInfo.qty}</p>

        {/* Display purchased attributes (size, color, etc.) */}
        {canReviewData.orderInfo.attributes.length > 0 && (
          <div className="purchased-variant">
            <p>Variant you purchased:</p>
            {canReviewData.orderInfo.attributes.map((attr, index) => (
              <span key={index}>
                {attr.name}: {attr.value}
              </span>
            ))}
          </div>
        )}

        {/* Show review form here */}
        <ReviewForm
          productId={productId}
          transactionId={canReviewData.orderInfo.transactionId}
          orderId={canReviewData.orderInfo.orderId}
        />
      </div>
    );
  }

  // Case 2: User already reviewed this product
  if (canReviewData?.hasExistingReview && canReviewData.existingReview) {
    const review = canReviewData.existingReview;
    return (
      <div className="existing-review">
        <h3>Your Review</h3>
        <div className="review-card">
          <div className="rating">⭐ {review.rating}/5</div>
          {review.title && <h4>{review.title}</h4>}
          <p>{review.review}</p>

          {/* Display review images */}
          {review.images && review.images.length > 0 && (
            <div className="review-images">
              {review.images.map((img, index) => (
                <img key={index} src={img} alt={`Review ${index + 1}`} />
              ))}
            </div>
          )}

          {/* Display variant info if available */}
          {review.size && <p>Size: {review.size}</p>}
          {review.fit && <p>Fit: {review.fit}</p>}

          <div className="review-stats">
            <span>👍 {review.likesCount} likes</span>
            <span>💬 {review.repliesCount} replies</span>
          </div>

          <p className="review-date">
            Reviewed on {new Date(review.createdAt).toLocaleDateString()}
          </p>

          {/* Optional: Edit button */}
          <button onClick={() => handleEditReview(review._id)}>
            Edit Review
          </button>
        </div>
      </div>
    );
  }

  // Case 3: User cannot review (show reason)
  if (!canReviewData?.canReview && canReviewData?.reason) {
    return (
      <div className="cannot-review">
        {canReviewData.reason === 'Login required' ? (
          <div className="login-prompt">
            <p>Please log in to review this product</p>
            <button onClick={() => router.push('/login')}>Log In</button>
          </div>
        ) : (
          <div className="ineligible-message">
            <p>{canReviewData.reason}</p>
            {canReviewData.reason.includes('purchased') && (
              <button onClick={() => router.push(`/product/${productId}`)}>
                Purchase Product
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Mock ReviewForm component (you'll implement this)
function ReviewForm({
  productId,
  transactionId,
  orderId
}: {
  productId: string;
  transactionId: string;
  orderId: string;
}) {
  return (
    <form>
      {/* Your review form implementation */}
      <textarea placeholder="Write your review..." />
      <button type="submit">Submit Review</button>
    </form>
  );
}
