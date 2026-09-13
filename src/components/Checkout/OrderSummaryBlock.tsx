'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { CartItem } from '@/context/CartContext';
import CartItemCard from '@/components/Checkout/CartItemCard';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { hasProductIssues } from '@/utils/cartCorrections';
import type { CheckoutErrors } from '@/types/checkout';
import type {
  AppliedCoupon,
  CheckoutCorrectionPayload,
  ShippingMethodType,
} from '@/hooks/useCheckoutController';
import { formatToNaira } from '@/utils/currencyFormatter';

export interface OrderSummaryBlockProps {
  /**
   * Root for EVERY DOM id this block emits (section, coupon input, coupon error).
   * Two instances of this component are mounted at once on checkout (mobile bar +
   * desktop panel); give each one its own prefix or the ids collide and the
   * aria-controls / aria-describedby / <label htmlFor> links resolve to the wrong node.
   */
  idPrefix?: string;

  // Cart data
  items: CartItem[];
  isLoading: boolean;

  // Display state
  isExpanded: boolean;
  onToggle: () => void;

  // Cart statistics
  cartStats: { totalItems: number; uniqueProducts: number };

  // Pricing. resolvedShippingCost / resolvedTotal are `number | null` on purpose:
  // null means "unknown until an address is entered" and must NEVER be `?? 0`-ed
  // into a confident-looking ₦0.
  resolvedSubtotal: number;
  resolvedDiscount: number;
  resolvedShippingCost: number | null;
  resolvedTotal: number | null;
  /** Line savings + coupon discount. Computed by the controller, never here. */
  totalSavings: number;

  // Shipping state
  shippingMethod: ShippingMethodType;
  shippingEtaLabel: string;
  isCalculatingShipping: boolean;
  shippingCalculationError: string | null;

  // Corrections
  pendingCorrections: CheckoutCorrectionPayload | null;
  parsedCheckoutErrors: CheckoutErrors | null;

  /** Line-level out-of-stock set (cartItemIds), NOT the product-id set. */
  outOfStockCartItemIds?: Set<string>;

  // Discount code
  /** Default true. Set false where the code is collected elsewhere. */
  showDiscountField?: boolean;
  couponCodeInput: string;
  onCouponCodeInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  isValidatingCoupon: boolean;
}

const OrderSummaryBlock: React.FC<OrderSummaryBlockProps> = ({
  idPrefix = 'checkout',
  items,
  isLoading,
  isExpanded,
  onToggle,
  cartStats,
  resolvedSubtotal,
  resolvedDiscount,
  resolvedShippingCost,
  resolvedTotal,
  totalSavings,
  shippingMethod,
  shippingEtaLabel,
  isCalculatingShipping,
  shippingCalculationError,
  pendingCorrections,
  parsedCheckoutErrors,
  outOfStockCartItemIds,
  showDiscountField = true,
  couponCodeInput,
  onCouponCodeInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  appliedCoupon,
  couponError,
  isValidatingCoupon,
}) => {
  const hasOutOfStockLines = Boolean(outOfStockCartItemIds && outOfStockCartItemIds.size > 0);
  const canApplyCoupon = couponCodeInput.trim().length > 0 && !isValidatingCoupon;

  // Every id in this subtree hangs off idPrefix. CollapsibleSection derives its own
  // content region id as `${id}-content`, so prefixing the section id is enough there.
  const sectionId = `${idPrefix}-order-summary`;
  const couponInputId = `${idPrefix}-coupon-code`;
  const couponErrorId = `${idPrefix}-coupon-error`;

  const handleCouponSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canApplyCoupon) return;
    onApplyCoupon();
  };

  /* ---------- collapsible region: the line items ---------- */
  const itemList = (
    <div className="list-product-checkout max-h-[300px] overflow-y-auto sm:max-h-[400px]">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-3">
            <Icon.CircleNotch size={32} weight="bold" className="animate-spin text-blue-600" />
            <p className="text-button text-secondary">Loading cart...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-3 text-secondary">
            <Icon.ShoppingCartSimple size={32} weight="bold" />
            <p className="text-button">No product in cart</p>
          </div>
        </div>
      ) : (
        items.map((item) => (
          // cartItemId, NOT _id/id: the same product can sit in the cart twice
          // with different attributes, and a product-id key collides.
          <CartItemCard
            key={item.cartItemId}
            item={item}
            isUnavailable={outOfStockCartItemIds?.has(item.cartItemId)}
          />
        ))
      )}
    </div>
  );

  /* ---------- always-visible region: code field, totals, badges, alerts ---------- */
  const footer = (
    <div>
      {hasOutOfStockLines && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <Icon.WarningCircle
            size={16}
            weight="bold"
            className="mt-0.5 flex-shrink-0 text-red-600"
          />
          <div>
            <p className="font-semibold text-red-900">Item(s) no longer available</p>
            <p className="mt-0.5 text-xs text-red-700">
              One or more items sold out while you were checking out. Please return to your cart to
              remove them before placing your order.
            </p>
          </div>
        </div>
      )}

      {/* Discount code */}
      {showDiscountField && (
        <div className="discount-code mt-4 border-t border-line pt-4 md:mt-5 md:pt-5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-lime-200 bg-lime-50 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <Icon.CheckCircle
                  size={20}
                  weight="duotone"
                  className="flex-shrink-0 text-green-600"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-green-700">
                    {appliedCoupon.code} applied
                  </p>
                  <p className="caption1 text-secondary">
                    You save {formatToNaira(appliedCoupon.amount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemoveCoupon}
                className="flex-shrink-0 text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleCouponSubmit}>
              <label htmlFor={couponInputId} className="mb-2 flex items-center gap-2">
                <Icon.Tag size={16} weight="duotone" className="h-4 w-4 flex-shrink-0" />
                <span className="text-button">Discount code</span>
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id={couponInputId}
                  type="text"
                  value={couponCodeInput}
                  onChange={(event) => onCouponCodeInputChange(event.target.value)}
                  placeholder="Enter code"
                  autoComplete="off"
                  disabled={isValidatingCoupon}
                  aria-invalid={couponError ? true : undefined}
                  aria-describedby={couponError ? couponErrorId : undefined}
                  className="w-full min-w-0 flex-1 rounded-lg border border-line px-4 py-3 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!canApplyCoupon}
                  className="button-main flex items-center justify-center whitespace-nowrap rounded-lg px-5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isValidatingCoupon ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </form>
          )}

          {/* Deliberately OUTSIDE any "available coupons" conditional — on the cart
                        page this message is nested inside one, so a bad code silently does
                        nothing whenever there are no promoted coupons. */}
          {couponError && (
            <p id={couponErrorId} className="mt-2 text-sm text-red-600">
              {couponError}
            </p>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="order-summary mt-4 space-y-2 border-t border-line pt-4 md:mt-5 md:space-y-3 md:pt-5">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary md:text-base">Subtotal</span>
          <span className="text-sm font-medium md:text-base">
            {formatToNaira(resolvedSubtotal)}
          </span>
        </div>

        {/* Coupon discount */}
        {resolvedDiscount > 0 && (
          <div className="flex items-center justify-between text-green-600">
            <span className="flex items-center gap-1 text-sm md:text-base">
              <Icon.Tag size={16} weight="duotone" className="h-4 w-4 flex-shrink-0" />
              Discount {appliedCoupon?.code && `(${appliedCoupon.code})`}
            </span>
            <span className="font-semibold">-{formatToNaira(resolvedDiscount)}</span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-secondary md:text-base">
            <Icon.Truck size={16} weight="duotone" className="h-4 w-4 flex-shrink-0" />
            Shipping
          </span>
          <span className="text-button">
            {shippingMethod === 'pickup' ? (
              <span className="font-semibold text-green-600">Free</span>
            ) : isCalculatingShipping ? (
              <span className="flex items-center gap-1">
                <Icon.CircleNotch size={14} weight="bold" className="animate-spin" />
                Calculating...
              </span>
            ) : shippingCalculationError ? (
              <span className="text-xs text-red-600">Error</span>
            ) : resolvedShippingCost !== null ? (
              formatToNaira(resolvedShippingCost)
            ) : (
              <span className="text-xs text-secondary">Enter address</span>
            )}
          </span>
        </div>

        {shippingMethod !== 'pickup' && (
          <div className="-mt-1 text-xs text-secondary">Estimated delivery: {shippingEtaLabel}</div>
        )}

        {/* Total savings — line-level savings plus the coupon, in one line. */}
        {totalSavings > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-secondary md:text-base">
              <Icon.Tag size={16} weight="duotone" className="h-4 w-4 flex-shrink-0" />
              You saved
            </span>
            <span className="font-medium italic text-green-600">
              -{formatToNaira(totalSavings)}
            </span>
          </div>
        )}

        {/* Shipping calculation error */}
        {shippingCalculationError && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <Icon.WarningCircle size={14} weight="bold" className="mt-0.5 flex-shrink-0" />
            <span>{shippingCalculationError}</span>
          </div>
        )}

        {/* While a correction is pending the figures above come from the server
                    correction but the lines above them are still the uncorrected client
                    cart, so they will not reconcile. This notice is what explains that. */}
        {pendingCorrections && (
          <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <Icon.WarningDiamond size={14} weight="duotone" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Cart updated by store</p>
              <p className="mt-0.5 leading-snug">
                These totals reflect the store&apos;s update, so they may not match the items listed
                above. Accept the updates to keep your totals accurate before completing payment.
              </p>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between border-t border-line pt-2 md:pt-3">
          <span className="text-base font-semibold md:text-lg">Total</span>
          <span className="text-lg font-bold md:text-xl lg:text-2xl">
            {resolvedTotal !== null ? (
              formatToNaira(resolvedTotal)
            ) : (
              <span className="text-sm text-secondary">Add shipping info</span>
            )}
          </span>
        </div>
      </div>

      {/* Inline alerts for shipping / coupon changes */}
      {parsedCheckoutErrors && !hasProductIssues(parsedCheckoutErrors) && (
        <div className="mt-4 space-y-2">
          {parsedCheckoutErrors.shipping && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <Icon.Truck size={20} weight="duotone" className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Shipping Cost Updated</p>
                <p className="mt-1 text-xs text-blue-700">
                  {parsedCheckoutErrors.shipping.reason} (
                  {formatToNaira(parsedCheckoutErrors.shipping.previousCost)} →{' '}
                  {formatToNaira(parsedCheckoutErrors.shipping.currentCost)})
                </p>
              </div>
            </div>
          )}

          {parsedCheckoutErrors.coupons && parsedCheckoutErrors.coupons.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
              <Icon.Warning
                size={20}
                weight="duotone"
                className="mt-0.5 flex-shrink-0 text-yellow-600"
              />
              <div className="flex-1">
                <p className="mb-1 font-semibold text-yellow-900">Coupon Issue</p>
                {parsedCheckoutErrors.coupons.map(
                  (coupon: { code: string; reason: string }, idx: number) => (
                    <p key={idx} className="text-xs text-yellow-700">
                      • {coupon.code}: {coupon.reason}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total-only error (blocking) */}
      {parsedCheckoutErrors?.total && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <Icon.XCircle size={20} weight="duotone" className="mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Checkout Error</p>
            <p className="mt-1 text-xs text-red-700">{parsedCheckoutErrors.total.message}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CollapsibleSection
      id={sectionId}
      variant="plain"
      title="Your Order"
      icon={
        <Icon.ShoppingCart
          size={24}
          weight="duotone"
          className="h-5 w-5 flex-shrink-0 md:h-6 md:w-6"
        />
      }
      summary={
        <span className="flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="whitespace-nowrap">{cartStats.totalItems} items</span>
          <span aria-hidden="true">•</span>
          <span className="whitespace-nowrap">{cartStats.uniqueProducts} products</span>
        </span>
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
      footer={footer}
    >
      {itemList}
    </CollapsibleSection>
  );
};

export default OrderSummaryBlock;
