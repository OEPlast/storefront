# OEPlast Storefront - GitHub Copilot Instructions

## Project Overview

Next.js 15 e-commerce storefront for OEPlast, currently **in migration** from Context API to modern state management (React Query + Zustand). This is a **production codebase** with legacy and new patterns coexisting.

**Critical Rule**: DO NOT refactor or remove existing Context providers - migration is gradual and manual.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Auth**: NextAuth v5 (beta) with MongoDB adapter
- **State** (Legacy): Context API + useReducer in `src/context/*`
- **State** (Planned): React Query + Zustand (see `docs/ARCHITECTURE.md`)
- **Styling**: TailwindCSS + Framer Motion
- **TypeScript**: Strict mode enabled (NO `any` types)
- **Forms**: @tanstack/react-form + Zod validation (see `docs/FORM_PATTERNS.md`)
  - **CRITICAL**: Use form-level validation, NOT field-level validators
  - **CRITICAL**: Use `FieldInfo` component pattern for error display (see below)
  - **CRITICAL**: Use `form.Subscribe` for submit button state
  - **CRITICAL**: Always prevent default form submission with `e.preventDefault()` and `e.stopPropagation()`

## Form Error Display Pattern

**Always use the `FieldInfo` component for consistent error handling:**

```typescript
import { FieldInfo } from '@/components/Form/FieldInfo';

// Usage in form fields - Add red border on error:
<form.Field
  name="firstName"
  children={(field) => {
    const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
    
    return (
      <div>
        <input
          className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
            hasError ? 'border-red-600' : ''
          }`}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
        />
        <FieldInfo field={field} />
      </div>
    );
  }}
/>
```

**CRITICAL Styling Rules**:
- **Input borders**: Must turn red (`border-red-600`) when field has error
- **Error text**: Always use red color (`text-red-600`) via FieldInfo component
- **Error state**: Check `field.state.meta.isTouched && !field.state.meta.isValid`
- **Consistency**: All form inputs must follow this pattern

**Benefits**:
- **DRY**: Single source of truth for error display logic
- **Consistent**: Same error behavior and styling across all forms
- **Type-safe**: Uses `AnyFieldApi` for full type safety
- **Visual**: Clear visual feedback with red borders and error messages
- **Clean**: Removes repetitive conditional rendering from fields

## File Structure Patterns

### Server/Client Component Split (CRITICAL)

Every route follows this pattern:

```
app/(group)/route/
├── page.tsx              # Server Component (async, no hooks, prefetch data)
└── RouteClient.tsx       # Client Component ('use client', hooks, interactivity)
```

**Examples**: `src/app/cart/page.tsx`, `src/app/login/page.tsx`

### State Management (Current)

```typescript
// Legacy Context API - DO NOT REMOVE
import { useCart } from '@/context/CartContext';
const { cartState, addToCart } = useCart();

// Provider stack in src/app/GlobalProvider.tsx:
// CartProvider → ModalCartProvider → WishlistProvider → ...
```

All state is currently in Context API. See `docs/ARCHITECTURE.md` for planned migration to React Query + Zustand.

## Critical Conventions

### 1. Component Size Rules

- **Min**: 50 lines (below = consider inlining)
- **Max**: 350 lines (above = MUST abstract)
- **Sweet Spot**: 100-200 lines

**When to abstract**:
- Component >350 lines → Extract into focused sub-components
- JSX block >100 lines → Extract to separate component
- Logic repeated 2+ times → Extract to utility/hook
- Nested conditionals 3+ levels → Extract to component

```tsx
// ❌ BAD: 500+ line monolith
export default function ProductPage() { /* ... */ }

// ✅ GOOD: Abstracted
export default function ProductPage() {
  return (
    <>
      <ProductHeader />
      <ProductImages />
      <ProductInfo />
      <ProductReviews />
    </>
  );
}
```

### 2. DRY Principle

**Extract Repeated Patterns**:

```tsx
// ❌ BAD: Duplicated UI
<button className="rounded-lg bg-blue-500 px-4 py-2">Add to Cart</button>
<button className="rounded-lg bg-blue-500 px-4 py-2">Buy Now</button>

// ✅ GOOD: Reusable component
import { Button } from '@/components/common/Button';
<Button variant="primary">Add to Cart</Button>
```

**Extract Repeated Logic**:

```typescript
// ❌ BAD: Duplicated calculation
const subtotal1 = cart1.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ✅ GOOD: Utility function
import { calculateSubtotal } from '@/utils/cart';
const subtotal1 = calculateSubtotal(cart1.items);
```

**Centralize Constants**:

```typescript
// ❌ BAD: Magic numbers
if (cart.items.length > 20) { /* ... */ }

// ✅ GOOD: Constants file
import { CART_LIMITS } from '@/utils/constants';
if (cart.items.length > CART_LIMITS.MAX_ITEMS) { /* ... */ }
```

### 3. TypeScript Strictness

```typescript
// ❌ NEVER use any
const data: any = await fetch(...);

// ✅ Use proper types
interface Product { id: string; name: string; }
const data: Product = await fetch(...);

// ✅ Better (planned with Zod)
const data = productSchema.parse(await fetch(...));
```

## API Integration

### Current Setup

```typescript
// src/libs/apiRoutes.ts
import { APIRoutes } from '@/libs/apiRoutes';

// Usage
fetch(APIRoutes.login, { method: 'POST', body: JSON.stringify(credentials) });
```

**Environment Variables**:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth secret

### Planned (React Query + Axios)

See `docs/ARCHITECTURE.md` sections:
- "Core Layers" (line ~273)
- "React Query Layer" (line ~576)

## Authentication

**Framework**: NextAuth v5 (beta) with MongoDB adapter

```typescript
// Server Component
import { auth } from '@/auth';
const session = await auth();

// Client Component
import { useSession } from 'next-auth/react';
const { data: session } = useSession();
```

**Config**: `auth.ts` (custom Google OAuth + Credentials providers)  
**Middleware**: `middleware.ts` (route protection)  
**Actions**: `src/actions/google-login.ts`

## Development Workflow

### Commands

```bash
npm run dev        # Dev server on PORT 3009 (NOT 3000!)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
```

**Port Note**: Dev server runs on **port 3009** (configured in `package.json`)

### Component Directory

```
src/components/
├── Home1/, Home2/, ...Home11/    # Homepage variants (legacy)
├── Product/                       # Product display
├── Shop/                          # Shopping/filtering
├── Modal/                         # Modal overlays
├── Header/, Footer/, Breadcrumb/  # Layout
└── [Feature]/                     # Feature-specific (Cosmetic1, Jewelry, etc.)
```

**Pattern**: Components organized by feature/page, NOT by type (Button, Input).

## Import Aliases

```typescript
import { Component } from '@/components/...';  // src/components
import { useCart } from '@/context/...';       // src/context
import { api } from '@/libs/...';              // src/libs
import type { ProductType } from '@/type/...'; // src/type
```

## Code Quality Checklist

Before submitting changes:

- [ ] Component size: 50-350 lines (abstract if >350)
- [ ] No `any` types (use proper TypeScript)
- [ ] DRY: Extract repeated patterns to components/utils/hooks
- [ ] Constants: No magic numbers/strings
- [ ] Server/Client: Correct 'use client' boundary
- [ ] Context API: Not modified (unless explicitly migrating)
- [ ] Tests: Run on port 3009

## Critical Don'ts

1. ❌ DO NOT refactor `src/app/GlobalProvider.tsx`
2. ❌ DO NOT remove Context providers from `src/context/*`
3. ❌ DO NOT change dev port from 3009
4. ❌ DO NOT use `any` type
5. ❌ DO NOT mix server/client code without 'use client'
6. ❌ DO NOT create components >350 lines
7. ❌ DO NOT repeat code (follow DRY)
8. ❌ DO NOT use magic numbers (define constants)
9. ❌ DO NOT overcomplicate simple components (keep it simple) <use simple fetch, or even if you need to hoist, use normal functions as opposed too much react query>
## Migration Path (New Features Only)

For **NEW** features, follow the modern patterns in `docs/ARCHITECTURE.md`:

1. Define Zod schemas (`src/libs/schemas/`)
2. Create React Query hooks (`src/hooks/queries/`, `src/hooks/mutations/`)
3. Use Zustand for UI state (`src/store/`)
4. Apply server/client split pattern

**Example**: See "Integration Examples" in `docs/ARCHITECTURE.md` (line ~1715)

## Additional Resources

- **Full Architecture**: `docs/ARCHITECTURE.md` (2100+ lines, comprehensive guide)
- **AI Agent Guide**: `.github/architecture-instructions.md` (detailed conventions)
- **API Docs**: `docs/openapi.yaml` (backend server, in `old-main-server/`)

## When in Doubt

1. Check `docs/ARCHITECTURE.md` first
2. Look for similar existing patterns in codebase
3. **Ask before refactoring** legacy code
4. **Describe your plan** before implementing structural changes

**Remember**: This is a production system in gradual migration. Preserve existing functionality while adopting new patterns for new features.
