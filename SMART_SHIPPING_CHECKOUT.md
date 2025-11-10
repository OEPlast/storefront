# Smart Shipping Checkout Flow - Complete

## Overview

The checkout page now intelligently handles different shipping methods with conditional form requirements and automatic shipping cost calculation via API. The payment button is only enabled when all necessary conditions are met.

---

## Shipping Methods

### 1. **Pickup (Free - $0.00)**

- **Cost**: $0.00 (no shipping fee)
- **Shipping Info**: Not required
- **Payment Button**: Enabled immediately
- **User Flow**: Select items → Choose pickup → Proceed to payment

### 2. **Normal Delivery (Calculated at Checkout)**

- **Cost**: Calculated via API based on address
- **Shipping Info**: Required (full address)
- **Payment Button**: Disabled until:
  - All shipping fields completed
  - API returns shipping cost
- **User Flow**: Select items → Choose normal delivery → Fill shipping info → Wait for calculation → Proceed to payment

### 3. **Express Delivery (Fastest - Calculated at Checkout)**

- **Cost**: Calculated via API based on address
- **Shipping Info**: Required (full address)
- **Payment Button**: Disabled until:
  - All shipping fields completed
  - API returns shipping cost
- **User Flow**: Select items → Choose express delivery → Fill shipping info → Wait for calculation → Proceed to payment

---

## Implementation Flow

### **Step 1: Cart Page - Shipping Method Selection**

User selects shipping method on cart page:

```tsx
// Cart page passes method type to checkout
const redirectToCheckout = () => {
  const shippingMethod = shipCart === 0 ? 'pickup' : shipCart === 30 ? 'normal' : 'express';
  router.push(`/checkout?discount=${discountCart}&ship=${shipCart}&method=${shippingMethod}`);
};
```

**Query Parameters Passed**:

- `discount`: Discount amount
- `ship`: Initial shipping cost (0 for pickup, placeholder for delivery)
- `method`: Shipping method type (`pickup`, `normal`, `express`)

---

### **Step 2: Checkout Page - Parse Shipping Method**

Checkout page reads the shipping method:

```tsx
const shippingMethod = searchParams.get('method') || 'pickup'; // pickup, normal, express
```

---

### **Step 3: Conditional Form Display**

#### Pickup Method:

```tsx
// Shipping info section is NOT rendered
{
  shippingMethod !== 'pickup' && (
    <div className="shipping-section">{/* Shipping form fields */}</div>
  );
}
```

**Result**: Clean checkout experience without unnecessary fields

#### Delivery Methods (Normal/Express):

```tsx
// Shipping info section IS rendered with all required fields
<div className="shipping-section border-line rounded-lg border">
  <div className="flex cursor-pointer items-center justify-between p-5">
    <div className="heading6">Shipping Information *</div>
    <div className="text-secondary caption1">
      {isShippingFormComplete ? (
        <span className="text-green-600">✓ Complete</span>
      ) : (
        'Required for delivery cost calculation'
      )}
    </div>
  </div>
  {/* Form fields */}
</div>
```

**Visual Feedback**:

- ✓ Green checkmark when complete
- Warning text when incomplete

---

### **Step 4: Form State Management**

#### Form State:

```tsx
const [shippingForm, setShippingForm] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  region: '',
  city: '',
  apartment: '',
  country: '',
  postal: '',
});
```

#### Controlled Inputs:

```tsx
<input
  value={shippingForm.firstName}
  onChange={(e) => handleShippingFormChange('firstName', e.target.value)}
  required
/>
```

#### Update Handler:

```tsx
const handleShippingFormChange = (field: string, value: string) => {
  setShippingForm((prev) => ({ ...prev, [field]: value }));
};
```

---

### **Step 5: Form Completion Validation**

```tsx
const isShippingFormComplete = useMemo(() => {
  if (shippingMethod === 'pickup') return true;

  return (
    shippingForm.firstName.trim() !== '' &&
    shippingForm.lastName.trim() !== '' &&
    shippingForm.email.trim() !== '' &&
    shippingForm.phoneNumber.trim() !== '' &&
    shippingForm.region !== '' &&
    shippingForm.city.trim() !== '' &&
    shippingForm.apartment.trim() !== '' &&
    shippingForm.country !== '' &&
    shippingForm.postal.trim() !== ''
  );
}, [shippingForm, shippingMethod]);
```

**Logic**:

- Pickup: Always returns `true` (no validation needed)
- Delivery: All fields must be non-empty

---

### **Step 6: Automatic Shipping Cost Calculation**

#### Trigger Conditions:

- Shipping method is NOT pickup
- Shipping form is complete
- Items exist in cart

#### API Call Effect:

```tsx
React.useEffect(() => {
  const calculateShipping = async () => {
    if (shippingMethod === 'pickup') {
      setCalculatedShippingCost(0);
      return;
    }

    if (!isShippingFormComplete) return;

    setIsCalculatingShipping(true);
    setShippingCalculationError(null);

    try {
      // Real API call (to be implemented)
      const response = await fetch('/api/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingMethod,
          address: shippingForm,
          items: items.map((item) => ({
            weight: item.productSnapshot.weight,
            dimensions: item.productSnapshot.dimensions,
            quantity: item.qty,
          })),
        }),
      });
      const data = await response.json();
      setCalculatedShippingCost(data.cost);
    } catch (error) {
      setShippingCalculationError('Failed to calculate shipping cost. Please try again.');
      setCalculatedShippingCost(null);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  calculateShipping();
}, [isShippingFormComplete, shippingMethod, shippingForm, items]);
```

#### Current Implementation (Mock):

```tsx
// TEMPORARY: Simulate API call
await new Promise((resolve) => setTimeout(resolve, 1500));
const mockCost = shippingMethod === 'normal' ? 15.99 : 29.99;
setCalculatedShippingCost(mockCost);
```

**To Replace With Real API**:

1. Uncomment real API call code
2. Replace `/api/calculate-shipping` with actual endpoint
3. Update request payload to match backend schema
4. Handle response structure from backend

---

### **Step 7: Shipping Cost Display States**

#### Pickup:

```tsx
<span className="font-semibold text-green-600">Free (Pickup)</span>
```

#### Calculating:

```tsx
<span className="text-blue flex items-center gap-1">
  <Icon.CircleNotch size={14} weight="bold" className="animate-spin" />
  Calculating...
</span>
```

#### Error:

```tsx
<span className="text-red-600 text-xs">Error</span>
<div className="bg-red-50 border border-red-200 rounded text-xs text-red-700">
  <Icon.WarningCircle size={14} />
  {shippingCalculationError}
</div>
```

#### Calculated:

```tsx
<span className="text-button">${calculatedShippingCost.toFixed(2)}</span>
```

#### Pending Address:

```tsx
<span className="text-secondary text-xs">Enter address</span>
```

---

### **Step 8: Payment Button State Management**

#### Enable Condition:

```tsx
const canProceedToPayment = useMemo(() => {
  if (shippingMethod === 'pickup') return true;
  return isShippingFormComplete && calculatedShippingCost !== null && !isCalculatingShipping;
}, [shippingMethod, isShippingFormComplete, calculatedShippingCost, isCalculatingShipping]);
```

**Logic**:

- Pickup: Always enabled
- Delivery: Enabled only when:
  - Form is complete
  - Shipping cost calculated successfully
  - Not currently calculating

#### Button UI States:

**Pickup (Enabled)**:

```tsx
<button className="button-main w-full">
  <Icon.CreditCard size={20} />
  Proceed to Payment
</button>
```

**Calculating Shipping**:

```tsx
<button className="button-main w-full cursor-not-allowed opacity-50" disabled>
  <Icon.CircleNotch size={20} className="animate-spin" />
  Calculating Shipping...
</button>
```

**Incomplete Form**:

```tsx
<button className="button-main w-full opacity-50 cursor-not-allowed" disabled>
  <Icon.Lock size={20} />
  Complete Shipping Info to Continue
</button>
<p className="text-xs text-secondary text-center mt-2">
  Please fill in all required shipping fields
</p>
```

**Ready (Enabled)**:

```tsx
<button className="button-main w-full">
  <Icon.CreditCard size={20} />
  Proceed to Payment
</button>
```

---

## Visual States Summary

### Shipping Method Badge

Always visible at top of form:

```
🚚 Selected Method: Pickup
   No shipping address required
```

```
🚚 Selected Method: Normal Delivery
```

```
🚚 Selected Method: Express Delivery
```

### Shipping Info Section Header

**Incomplete**:

```
📦 Shipping Information *
   Required for delivery cost calculation
   [Chevron Down]
```

**Complete**:

```
📦 Shipping Information *
   ✓ Complete
   [Chevron Up]
```

### Order Summary - Shipping Line

**Pickup**:

```
🚚 Shipping          Free (Pickup)
```

**Calculating**:

```
🚚 Shipping          ⟳ Calculating...
```

**Error**:

```
🚚 Shipping          Error
⚠️ Failed to calculate shipping cost. Please try again.
```

**Calculated**:

```
🚚 Shipping          $15.99
```

**Pending**:

```
🚚 Shipping          Enter address
```

### Total Display

**With Calculated Shipping**:

```
Total     $234.50
```

**Pending Shipping**:

```
Total     Pending shipping
```

---

## API Integration Guide

### Endpoint to Implement

```
POST /api/calculate-shipping
```

### Request Payload

```typescript
{
  shippingMethod: 'normal' | 'express',
  address: {
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    region: string,
    city: string,
    apartment: string,
    country: string,
    postal: string
  },
  items: [
    {
      weight: number,        // Product weight in kg
      dimensions: {          // Product dimensions in cm
        length: number,
        width: number,
        height: number
      },
      quantity: number
    }
  ]
}
```

### Response Schema

```typescript
{
  success: boolean,
  cost: number,           // Shipping cost in dollars
  estimatedDays: number,  // Optional: delivery time estimate
  carrier: string,        // Optional: shipping carrier name
  error?: string          // Error message if calculation failed
}
```

### Example Response

```json
{
  "success": true,
  "cost": 15.99,
  "estimatedDays": 5,
  "carrier": "USPS Priority Mail"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Unable to calculate shipping to this address"
}
```

---

## User Experience Flow

### **Pickup Method** (Simplest)

1. User selects "Pickup" on cart page
2. User clicks "Proceed To Checkout"
3. Checkout page loads with:
   - Blue badge showing "Selected Method: Pickup"
   - No shipping form (hidden)
   - Order summary showing "Free (Pickup)"
   - Payment button enabled
4. User proceeds directly to payment ✅

**Total Time**: < 5 seconds

---

### **Normal/Express Delivery** (With Validation)

1. User selects "Normal Delivery" or "Express Delivery" on cart page
2. User clicks "Proceed To Checkout"
3. Checkout page loads with:
   - Blue badge showing selected method
   - Shipping form expanded (required)
   - Order summary showing "Enter address"
   - Payment button disabled with lock icon
4. User fills in shipping form fields
5. As user completes last field:
   - Form header shows "✓ Complete"
   - Order summary shows "⟳ Calculating..."
   - Payment button shows "Calculating Shipping..."
6. After ~1.5 seconds (API call):
   - Order summary shows "$15.99"
   - Total updates to include shipping
   - Payment button enables with "Proceed to Payment"
7. User can now proceed to payment ✅

**Total Time**: ~20-30 seconds (including form fill)

---

## Error Handling

### Scenario 1: API Timeout

```tsx
// After 10 seconds with no response
setShippingCalculationError('Request timed out. Please try again.');
setCalculatedShippingCost(null);
```

**User sees**:

- Red error badge in order summary
- Payment button remains disabled
- Helper text: "Failed to calculate shipping cost"

**Recovery**: User can modify address to trigger retry

---

### Scenario 2: Invalid Address

```tsx
// API returns 400 Bad Request
setShippingCalculationError('Invalid shipping address. Please check your details.');
```

**User sees**:

- Red error badge with specific message
- Payment button disabled
- Clear instruction to fix address

**Recovery**: User corrects address fields

---

### Scenario 3: Service Unavailable

```tsx
// API returns 503
setShippingCalculationError('Shipping service temporarily unavailable. Please try again later.');
```

**User sees**:

- Red error badge
- Payment button disabled
- Suggestion to retry later

**Recovery**: User can refresh or come back later

---

## Testing Checklist

### Pickup Method

- [ ] Shipping form is hidden
- [ ] Shipping cost shows "Free (Pickup)"
- [ ] Payment button is enabled immediately
- [ ] Total calculation excludes shipping cost
- [ ] Badge shows "Pickup" method
- [ ] No API call is triggered

### Normal Delivery

- [ ] Shipping form is visible and expanded
- [ ] Form fields are required and validated
- [ ] Empty form disables payment button
- [ ] Completing form triggers API call
- [ ] Spinner shows during calculation
- [ ] Calculated cost displays correctly
- [ ] Total updates with shipping cost
- [ ] Payment button enables after calculation
- [ ] Error states display properly
- [ ] Badge shows "Normal Delivery"

### Express Delivery

- [ ] Same as Normal Delivery checklist
- [ ] Higher shipping cost returned
- [ ] Badge shows "Express Delivery"

### Edge Cases

- [ ] Network error handling
- [ ] API timeout handling
- [ ] Invalid address handling
- [ ] Empty cart handling
- [ ] Form validation (email format, phone format)
- [ ] Country/region selection
- [ ] State selection
- [ ] Postal code validation

---

## Performance Optimizations

### 1. **Debounced Calculation**

Future enhancement to avoid API spam:

```tsx
const debouncedCalculate = useMemo(() => debounce(calculateShipping, 1000), []);
```

### 2. **Caching**

Cache shipping costs by address hash:

```tsx
const addressHash = JSON.stringify(shippingForm);
if (shippingCostCache[addressHash]) {
  setCalculatedShippingCost(shippingCostCache[addressHash]);
  return;
}
```

### 3. **Optimistic UI**

Show estimated cost while calculating:

```tsx
const estimatedCost = shippingMethod === 'normal' ? 15 : 30;
setCalculatedShippingCost(estimatedCost);
// Then update with actual cost
```

---

## Accessibility

### Keyboard Navigation

- All form fields are keyboard accessible
- Payment button can be focused and activated with Enter
- Collapsible sections work with keyboard (Enter/Space)

### Screen Reader Support

```tsx
<button
  aria-label="Proceed to payment"
  aria-disabled={!canProceedToPayment}
  disabled={!canProceedToPayment}
>
  Proceed to Payment
</button>
```

### Visual Feedback

- Clear disabled states (opacity + cursor)
- Loading spinners with animation
- Success/error colors (green/red)
- Icon indicators (lock, checkmark, warning)

---

## Security Considerations

### 1. **API Authentication**

Ensure shipping calculation API requires valid session:

```tsx
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${session.token}`
}
```

### 2. **Rate Limiting**

Prevent API abuse with rate limiting on backend

### 3. **Input Sanitization**

Sanitize address inputs before sending to API

### 4. **HTTPS Only**

All shipping calculation requests over HTTPS

---

## Future Enhancements

### 1. **Address Autocomplete**

Integrate Google Places API for address suggestions

### 2. **Real-time Validation**

Validate address fields as user types

### 3. **Multiple Shipping Options**

Let user choose from multiple carriers/speeds

### 4. **Saved Addresses**

Store and reuse shipping addresses for returning users

### 5. **Shipping Insurance**

Optional insurance add-on for valuable orders

### 6. **Delivery Time Estimates**

Show estimated delivery date range

### 7. **Tracking Integration**

Generate tracking numbers and status updates

---

## Migration Notes

### Breaking Changes

- None - this is a new feature addition

### Configuration Required

1. Set up shipping calculation API endpoint
2. Configure shipping carrier integrations
3. Set up rate tables for normal/express delivery
4. Test with real addresses in production

### Environment Variables

```env
NEXT_PUBLIC_SHIPPING_API_URL=https://api.yoursite.com/calculate-shipping
SHIPPING_API_KEY=your_secret_key
```

---

## Summary

The checkout flow now provides a **smart, conditional experience** based on shipping method:

✅ **Pickup**: Immediate checkout, no forms, no API calls  
✅ **Delivery**: Required address, automatic calculation, validated before payment  
✅ **Payment Button**: Intelligently disabled/enabled based on requirements  
✅ **Visual Feedback**: Clear states for loading, error, success  
✅ **User-Friendly**: Smooth flow with helpful messages  
✅ **API-Ready**: Structured for real shipping calculation integration

**This creates a professional, trustworthy checkout experience! 🚀✨**
