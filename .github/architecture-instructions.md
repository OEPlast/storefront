# OEPlast Storefront - AI Coding Agent Instructions

**Last Updated:** October 12, 2025  
**Primary Reference:** See `docs/ARCHITECTURE.md` for comprehensive architecture details

---

## 🎯 Quick Context

This is a **Next.js 15 e-commerce storefront** in active migration from Context API to a modern state management stack. You're working on a production codebase with both legacy and new patterns coexisting.

**Critical**: DO NOT remove or refactor existing Context providers. The migration is gradual and manual.

---

## 🏗️ Architecture Philosophy

### Three-Layer State Management (Migration In Progress)

```
┌─────────────────────────────────────────┐
│ SERVER STATE (React Query - NEW)        │  ← Planned: Not yet implemented
│ └─ Products, Orders, User Data          │
├─────────────────────────────────────────┤
│ CLIENT STATE (Zustand - PLANNED)        │  ← Future: Migration target
│ └─ Cart, Modals, Filters                │
├─────────────────────────────────────────┤
│ LEGACY STATE (Context API - CURRENT)    │  ← Active: Don't touch yet
│ └─ Cart, Wishlist, Compare, Modals      │
└─────────────────────────────────────────┘
```

**Current Reality**: All state is in `src/context/*` using Context API + useReducer.  
**Planned Future**: See `docs/ARCHITECTURE.md` for target architecture.

---

## 📁 Directory Structure & Patterns

### Route Pattern (Server + Client Split)

**Every route follows this pattern:**

```
app/(shop)/product/[id]/
├── page.tsx              # Server Component - data prefetch, auth
└── ProductClient.tsx     # Client Component - interactivity, hooks
```

**Examples in codebase:**

- `src/app/shop/` - Product listing
- `src/app/product/` - Product detail
- `src/app/cart/` - Shopping cart
- `src/app/login/` - Authentication

**Rule**:

- `page.tsx` = async, no 'use client', no hooks
- `*Client.tsx` = 'use client', hooks, events, browser APIs

### Component Organization

```
src/components/
├── Home1/, Home2/, ...Home11/    # Homepage variants (legacy structure)
├── Product/                       # Product display components
├── Shop/                          # Shopping/filtering UI
├── Modal/                         # Modal overlays
└── [Category]/                    # Feature-specific (Cosmetic1, Jewelry, etc.)
```

**Pattern**: Components are organized by feature/page, NOT by type (Button, Input, etc.)

---

## 🔌 API Integration Layer

### Current Setup (Existing)

**File**: `src/libs/apiRoutes.ts`

```typescript
const ROUTES = {
  login: "/auth/login",
  providerLogin: "/auth/login/provider",
} as const;

// Usage
import { APIRoutes } from '@/libs/apiRoutes';
fetch(APIRoutes.login, { ... });
```

### Planned Setup (From ARCHITECTURE.md)

Will use:

- **Axios** for HTTP client with interceptors
- **React Query** for server state
- **Zod** for validation

**Location**: `src/libs/api/` (to be created)

---

## 🎨 Styling Conventions

- **TailwindCSS** for all styling
- **No CSS modules** or styled-components
- **Framer Motion** for animations
- **React Slick** for carousels

**Example Pattern**:

```tsx
<div className="container mx-auto py-8">
  <div className="grid grid-cols-4 gap-4">{/* content */}</div>
</div>
```

---

## 📏 Component Size & Abstraction Rules

### Component Size Guidelines

- **Minimum**: 50 lines (below this, consider inlining or merging)
- **Maximum**: 400 lines (above this, MUST abstract into smaller components)
- **Sweet Spot**: 100-200 lines per component

### When to Abstract (Component > 350 lines)

```tsx
// ❌ BAD: 550+ line monolithic component
export default function ProductPage() {
  // 100 lines of state/hooks
  // 200 lines of JSX
  // 200 lines of helper functions
  return <div>...</div>;
}

// ✅ GOOD: Abstracted into focused components
export default function ProductPage() {
  return (
    <>
      <ProductHeader />
      <ProductImages />
      <ProductInfo />
      <ProductReviews />
      <RelatedProducts />
    </>
  );
}
```

### Abstraction Triggers

1. **Logical Sections**: Different concerns (header, form, list, etc.)
2. **Repetition**: Same pattern used 2+ times
3. **Complexity**: Nested conditionals/maps 3+ levels deep
4. **Testability**: Hard to test = needs abstraction

**Rule**: If a child JSX block is >100 lines, extract it into a component.

---

## ♻️ DRY Principle (Don't Repeat Yourself)

### 1. Extract Repeated UI Patterns

```tsx
// ❌ BAD: Repeated button pattern
<button className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
  Add to Cart
</button>
<button className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
  Buy Now
</button>

// ✅ GOOD: Reusable Button component
import { Button } from '@/components/common/Button';
<Button variant="primary">Add to Cart</Button>
<Button variant="primary">Buy Now</Button>
```

### 2. Extract Repeated Logic

```typescript
// ❌ BAD: Duplicated formatting logic
const price1 = `$${(product1.price / 100).toFixed(2)}`;
const price2 = `$${(product2.price / 100).toFixed(2)}`;

// ✅ GOOD: Reusable utility function
import { formatPrice } from "@/utils/format";
const price1 = formatPrice(product1.price);
const price2 = formatPrice(product2.price);
```

### 3. Share Constants

```typescript
// ❌ BAD: Magic numbers/strings scattered
if (items.length > 20) {
  /* ... */
}
fetch("/api/products?limit=20");

// ✅ GOOD: Centralized constants
import { PRODUCT_LIMITS } from "@/utils/constants";
if (items.length > PRODUCT_LIMITS.MAX_CART_ITEMS) {
  /* ... */
}
fetch(`/api/products?limit=${PRODUCT_LIMITS.DEFAULT_PAGE_SIZE}`);
```

### 4. Reusable Hooks

```typescript
// ❌ BAD: Repeated data fetching logic
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch("/api/products").then(/* ... */);
}, []);

// ✅ GOOD: Custom hook
import { useProducts } from "@/hooks/queries/useProducts";
const { data: products, isLoading } = useProducts();
```

### Reusability Checklist

- [ ] Is this pattern used 2+ times? → Extract it
- [ ] Does this component have hardcoded values? → Make them props
- [ ] Is this logic business-specific? → Extract to utility/hook
- [ ] Can this be configured? → Add variant/type props
- [ ] Is this testable in isolation? → Good abstraction level

---

## 🔐 Authentication

**Current**: NextAuth v5 (beta) with MongoDB adapter

**Files**:

- `auth.ts` - NextAuth config
- `middleware.ts` - Route protection
- `src/actions/google-login.ts` - OAuth actions

**Session Pattern**:

```typescript
import { auth } from "@/auth";
const session = await auth(); // Server component
```

---

## 📦 State Management (Current Implementation)

### Legacy Context API (DO NOT REMOVE)

**Provider Stack** (`src/app/GlobalProvider.tsx`):

```tsx
<CartProvider>
  <ModalCartProvider>
    <WishlistProvider>
      <ModalWishlistProvider>
        <CompareProvider>
          <ModalCompareProvider>
            <ModalSearchProvider>
              <ModalQuickviewProvider>{children}</ModalQuickviewProvider>
            </ModalSearchProvider>
          </ModalCompareProvider>
        </CompareProvider>
      </ModalWishlistProvider>
    </WishlistProvider>
  </ModalCartProvider>
</CartProvider>
```

**Usage Pattern**:

```typescript
// In components
import { useCart } from "@/context/CartContext";
const { cartState, addToCart } = useCart();
```

**Files**:

- `src/context/CartContext.tsx` - Shopping cart
- `src/context/WishlistContext.tsx` - Wishlist
- `src/context/CompareContext.tsx` - Product comparison
- `src/context/Modal*.tsx` - Modal states

### Planned Migration (See ARCHITECTURE.md)

When implementing NEW features, follow the Zustand + React Query pattern documented in `docs/ARCHITECTURE.md`. Existing contexts remain until manually migrated.

---

## 🛠️ Development Workflow

### Commands

```bash
npm run dev        # Dev server on port 3009 (not default 3000!)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
```

### Environment Variables

Required in `.env`:

```
NEXT_PUBLIC_API_URL=<backend-api-url>
# NextAuth vars (check auth.ts for specifics)
```

### Port Configuration

**Critical**: Dev server runs on **port 3009**, not 3000

```json
// package.json
"dev": "next dev -p 3009"
```

---

## 🎯 Code Quality Standards

### TypeScript

- **Strict mode enabled** (`tsconfig.json`)
- **NO `any` types** - Use proper typing or `unknown`
- **Infer types from Zod schemas** (future pattern)

```typescript
// ❌ Bad
const data: any = await fetch(...);

// ✅ Good (current)
interface Product { id: string; name: string; }
const data: Product = await fetch(...);

// ✅ Better (planned - see ARCHITECTURE.md)
import { productSchema } from '@/libs/schemas/product.schema';
const data = productSchema.parse(await fetch(...));
```

### Component Size

- **Range**: 50-350 lines per component
- **If >350 lines**: MUST abstract into smaller components
- **If child JSX >50 lines**: SHOULD extract to separate component

### Import Aliases

```typescript
import { Component } from "@/components/..."; // src/components
import { useCart } from "@/context/..."; // src/context
import { api } from "@/libs/..."; // src/libs
```

### File Naming

- **Components**: PascalCase (`ProductCard.tsx`)
- **Utilities**: camelCase (`apiRoutes.ts`)
- **Client components**: `*Client.tsx`
- **Types**: `*.types.ts` or inline in schemas

---

## 🚨 Critical Don'ts

1. **DO NOT refactor `GlobalProvider.tsx`** - Migration is manual
2. **DO NOT remove Context providers** from `src/context/`
3. **DO NOT change port** from 3009 without updating docs
4. **DO NOT use `any` type** - strict TypeScript enforced
5. **DO NOT mix server/client code** in same file without 'use client' boundary
6. **DO NOT create components >350 lines** - abstract into smaller components
7. **DO NOT repeat code** - follow DRY principle (extract to components/utils/hooks)
8. **DO NOT use magic numbers/strings** - define constants in `@/utils/constants`

**Session Pattern**:

```typescript
import { auth } from "@/auth";
const session = await auth(); // Server component
```

---

## 📦 State Management (Current Implementation)

### Legacy Context API (DO NOT REMOVE)

**Provider Stack** (`src/app/GlobalProvider.tsx`):

```tsx
<CartProvider>
  <ModalCartProvider>
    <WishlistProvider>
      <ModalWishlistProvider>
        <CompareProvider>
          <ModalCompareProvider>
            <ModalSearchProvider>
              <ModalQuickviewProvider>{children}</ModalQuickviewProvider>
            </ModalSearchProvider>
          </ModalCompareProvider>
        </CompareProvider>
      </ModalWishlistProvider>
    </WishlistProvider>
  </ModalCartProvider>
</CartProvider>
```

**Usage Pattern**:

```typescript
// In components
import { useCart } from "@/context/CartContext";
const { cartState, addToCart } = useCart();
```

**Files**:

- `src/context/CartContext.tsx` - Shopping cart
- `src/context/WishlistContext.tsx` - Wishlist
- `src/context/CompareContext.tsx` - Product comparison
- `src/context/Modal*.tsx` - Modal states

### Planned Migration (See ARCHITECTURE.md)

When implementing NEW features, follow the Zustand + React Query pattern documented in `docs/ARCHITECTURE.md`. Existing contexts remain until manually migrated.

---

## 🛠️ Development Workflow

### Commands

```bash
npm run dev        # Dev server on port 3009 (not default 3000!)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
```

### Environment Variables

Required in `.env`:

```
NEXT_PUBLIC_API_URL=<backend-api-url>
# NextAuth vars (check auth.ts for specifics)
```

### Port Configuration

**Critical**: Dev server runs on **port 3009**, not 3000

```json
// package.json
"dev": "next dev -p 3009"
```

---

## 🎯 Code Quality Standards

### TypeScript

- **Strict mode enabled** (`tsconfig.json`)
- **NO `any` types** - Use proper typing or `unknown`
- **Infer types from Zod schemas** (future pattern)

```typescript
// ❌ Bad
const data: any = await fetch(...);

// ✅ Good (current)
interface Product { id: string; name: string; }
const data: Product = await fetch(...);

// ✅ Better (planned - see ARCHITECTURE.md)
import { productSchema } from '@/libs/schemas/product.schema';
const data = productSchema.parse(await fetch(...));
```

### Import Aliases

```typescript
import { Component } from "@/components/..."; // src/components
import { useCart } from "@/context/..."; // src/context
import { api } from "@/libs/..."; // src/libs
```

### File Naming

- **Components**: PascalCase (`ProductCard.tsx`)
- **Utilities**: camelCase (`apiRoutes.ts`)
- **Client components**: `*Client.tsx`
- **Types**: `*.types.ts` or inline in schemas

---

## 🚨 Critical Don'ts

1. **DO NOT refactor `GlobalProvider.tsx`** - Migration is manual
2. **DO NOT remove Context providers** from `src/context/`
3. **DO NOT change port** from 3009 without updating docs
4. **DO NOT use `any` type** - strict TypeScript enforced
5. **DO NOT mix server/client code** in same file without 'use client' boundary
6. **DO NOT create components >400 lines** - abstract into smaller components
7. **DO NOT repeat code** - follow DRY principle (extract to components/utils/hooks)
8. **DO NOT use magic numbers** - define constants in `@/utils/constants`

---

## 📚 Schema-First Development (Planned)

When implementing NEW features, follow this pattern (from ARCHITECTURE.md):

```typescript
// 1. Define Zod schema (src/libs/schemas/)
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
});

// 2. Infer TypeScript type
export type Product = z.infer<typeof productSchema>;

// 3. Validate API responses
const validated = productSchema.parse(response.data);

// 4. Use in forms (Zod 3.24+ supports Standard Schema natively)
const form = useForm({
  defaultValues: {
    /* ... */
  },
  onSubmit: async ({ value }) => {
    const validated = productSchema.parse(value);
  },
});

// 5. Field-level validation with Zod schemas directly
<form.Field
  name="fieldName"
  validators={{
    onChange: yourSchema.shape.fieldName, // No adapter needed!
  }}
/>;
```

**Location**: `src/libs/schemas/` (to be created)

---

## 🔄 Data Flow Patterns

### Current (Legacy)

```
Component → useContext → Context Provider → Local State
```

### Planned (New Features)

```
Server Component (page.tsx)
  ↓ Prefetch with React Query
  ↓ Pass to HydrationBoundary
  ↓
Client Component (*Client.tsx)
  ↓ useQuery (hydrated data)
  ↓ Zustand (UI state)
  ↓ React Form (input validation)
```

See `docs/ARCHITECTURE.md` sections:

- "Data Flow" (line ~1329)
- "Component Patterns" (line ~1654)

---

## 🧩 Integration Points

### External Dependencies

- **MongoDB**: User sessions, auth data (via NextAuth adapter)
- **Backend API**: Product, order, inventory data (`NEXT_PUBLIC_API_URL`)
- **Google OAuth**: Provider login (configured in `auth.ts`)

### Data Sources

- **Static JSON**: `src/data/Product.json`, `Blog.json` (dev data)
- **Images**: `public/images/` (product, banner, blog assets)
- **API**: Backend server (old-main-server) for production data

---

## 📖 Learning Resources

**Architecture Deep Dive**: `docs/ARCHITECTURE.md` (2100+ lines)

- Section 5: Core Layers (Axios, Zod, React Query, Zustand)
- Section 7: Component Patterns (Server/Client split)
- Section 9: Best Practices (Schema-first, Query keys)
- Section 10: Migration Guide (Context → Zustand)

---

## ✅ Implementation Checklist (Before Making Changes)

1. **Read** the relevant section in `docs/ARCHITECTURE.md`
2. **Check** if touching legacy Context code (if yes, ask first)
3. **Verify** TypeScript types (no `any`)
4. **Follow** server/client component pattern
5. **Test** on port 3009
6. **Describe** your plan before implementing
7. **Wait** for approval on structural changes

---

## 🤝 When in Doubt

1. Check `docs/ARCHITECTURE.md` first
2. Look for similar existing patterns in codebase
3. **Ask before refactoring** legacy code
4. **Describe your plan** before implementing new features

**Remember**: This is a production codebase in migration. Preserve existing functionality while adding new patterns.
