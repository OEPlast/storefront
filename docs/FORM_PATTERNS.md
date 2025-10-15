# Form Patterns with TanStack Form + Zod

## Overview

This document outlines the correct patterns for implementing forms using `@tanstack/react-form` with Zod validation, based on official TanStack Form documentation.

## FieldInfo Component Pattern (Recommended)

**Always use the reusable `FieldInfo` component for error display:**

```tsx
import { FieldInfo } from '@/components/Form/FieldInfo';
```

**CRITICAL: Input Field Styling with Errors**

All input fields MUST have red borders when they contain errors:

```tsx
<form.Field
  name="email"
  children={(field) => {
    const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
    
    return (
      <div>
        <input
          className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
            hasError ? 'border-red-600' : ''
          }`}
          type="email"
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

**Styling Rules:**
- ✅ Input borders: Add `border-red-600` class when `hasError` is true
- ✅ Error text: FieldInfo component displays red text automatically
- ✅ Consistency: ALL form inputs (text, email, password, select, textarea) must follow this pattern
- ✅ Visual feedback: Users must see both red border AND error message

**Benefits:**
- ✅ DRY - No repeated error display logic in every field
- ✅ Consistent error behavior and styling across all forms
- ✅ Type-safe with `AnyFieldApi`
- ✅ Handles both validation errors and loading states
- ✅ Clear visual feedback with red borders
- ✅ Easy to customize styling in one place

## Key Principles

### 1. Form-Level Validation (NOT Field-Level)

**✅ CORRECT - Validate at form level:**
```tsx
const form = useForm({
  defaultValues: { /* ... */ },
  validators: {
    onSubmit: yourZodSchema,  // Entire schema validates form
  },
  onSubmit: async ({ value }) => { /* ... */ }
});
```

**❌ INCORRECT - Don't validate individual fields:**
```tsx
<form.Field
  name="email"
  validators={{
    onBlur: emailSchema,  // DON'T DO THIS
  }}
  // ...
/>
```

### 2. Show Errors with FieldInfo Component + Red Borders

**✅ CORRECT - Use FieldInfo component with red border styling:**
```tsx
import { FieldInfo } from '@/components/Form/FieldInfo';

<form.Field
  name="email"
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

**❌ INCORRECT - Repetitive inline error checks and no red border:**
```tsx
<form.Field
  name="email"
  children={(field) => (
    <div>
      <input
        className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.isTouched && !field.state.meta.isValid && field.state.meta.errors?.length > 0 && (
        <p className="text-red-600">{field.state.meta.errors.join(", ")}</p>
      )}
    </div>
  )}
/>
```

### 3. Proper Form Submission Handler

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  }}>
  {/* fields */}
</form>
```

**Important:**
- Always use `e.preventDefault()` to prevent native form submission
- Use `e.stopPropagation()` to prevent event bubbling
- Call `form.handleSubmit()` directly

### 4. Submit Button with form.Subscribe

Use `form.Subscribe` to reactively disable button based on form state:

```tsx
<form.Subscribe
  selector={(state) => [state.canSubmit, state.isSubmitting]}
  children={([canSubmit, isSubmitting]) => (
    <button 
      type="submit" 
      disabled={!canSubmit || isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit"}
    </button>
  )}
/>
```

**Benefits:**
- No need for separate `isSubmitting` state
- Automatically disables when form is invalid
- Automatically disables during submission

### 5. Debug Validation Errors with onSubmitInvalid

Add comprehensive error logging for debugging:

```tsx
const form = useForm({
  defaultValues: { /* ... */ },
  validators: {
    onSubmit: yourZodSchema,
  },
  onSubmit: async ({ value }) => { /* ... */ },
  onSubmitInvalid: ({ value, formApi }) => {
    // This fires when validation fails
    console.log("❌ Form validation failed!");
    console.log("Form values:", value);
    console.log("All field errors:", formApi.state.errors);
    
    // Log individual field errors
    Object.entries(formApi.state.fieldMeta).forEach(([fieldName, meta]) => {
      if (meta.errors.length > 0) {
        console.error(`Field "${fieldName}" errors:`, meta.errors);
      }
    });
  },
});
```

## Complete Example

```tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { FieldInfo } from "@/components/Form/FieldInfo";
import { z } from "zod";

// Define Zod schema
const registrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function RegistrationForm() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: registrationSchema,  // Validate on submit
    },
    onSubmit: async ({ value }) => {
      // API call
      await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(value),
      });
    },
    onSubmitInvalid: ({ value, formApi }) => {
      console.log("❌ Form validation failed!");
      console.log("Form values:", value);
      Object.entries(formApi.state.fieldMeta).forEach(([fieldName, meta]) => {
        if (meta.errors.length > 0) {
          console.error(`Field "${fieldName}" errors:`, meta.errors);
        }
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}>
      
      {/* Email Field */}
      <form.Field
        name="email"
        children={(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
          
          return (
            <div>
              <input
                type="email"
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

      {/* Password Field */}
      <form.Field
        name="password"
        children={(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
          
          return (
            <div>
              <input
                type="password"
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

      {/* Submit Button */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        )}
      />
    </form>
  );
}
```

## When to Validate

TanStack Form supports multiple validation timings:

### onSubmit (Recommended for Registration/Login Forms)
```tsx
validators: {
  onSubmit: yourZodSchema,
}
```
- Validates only when form is submitted
- Least intrusive UX
- Best for forms with multiple fields
- Prevents premature error messages

### onBlur (Better for Simple Forms)
```tsx
validators: {
  onBlur: yourZodSchema,
}
```
- Validates when field loses focus
- More immediate feedback
- Good for forms with few fields

### onChange (Most Immediate Feedback)
```tsx
validators: {
  onChange: yourZodSchema,
}
```
- Validates as user types
- Immediate feedback
- Can be intrusive for complex validation rules
- Use sparingly

## Zod Schema Integration

TanStack Form supports Zod through the Standard Schema spec:

```tsx
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(3, "Must be at least 3 characters"),
  email: z.string().email("Invalid email"),
});

// Use directly in validators
const form = useForm({
  validators: {
    onSubmit: schema,  // ✅ Works automatically
  },
});
```

## Common Mistakes

### ❌ Using field-level validators
```tsx
<form.Field
  name="email"
  validators={{ onChange: emailSchema }}  // DON'T - use form-level validation
/>
```

### ❌ Repetitive inline error display
```tsx
{field.state.meta.isTouched && !field.state.meta.isValid && field.state.meta.errors?.length > 0 && (
  <p>{field.state.meta.errors.join(", ")}</p>
)}
// Use FieldInfo component instead!
```

### ❌ Not checking isTouched
```tsx
{field.state.meta.errors?.length > 0 && (  // Will show errors immediately
  <p>{field.state.meta.errors[0]}</p>
)}
```

### ❌ Managing isSubmitting manually
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);  // form.Subscribe does this
```

### ❌ Not preventing default form submission
```tsx
<form onSubmit={() => form.handleSubmit()}>  // Missing e.preventDefault()
```

## Resources

- [TanStack Form Docs](https://tanstack.com/form/latest)
- [TanStack Form Examples](https://tanstack.com/form/latest/docs/framework/react/examples/simple)
- [Standard Schema Docs](https://tanstack.com/form/latest/docs/framework/react/examples/standard-schema)
- [Zod Documentation](https://zod.dev)

## Migration from Old Pattern

If you have forms using field-level validators or inline error displays:

1. **Create FieldInfo component** at the top of your form file (or in a shared location)
2. **Move all field validators** to form-level `validators` object
3. **Remove individual `validators` props** from `<form.Field>`
4. **Replace inline error rendering** with `<FieldInfo field={field} />`
5. **Replace manual `isSubmitting` state** with `form.Subscribe`
6. **Update form `onSubmit`** to use `e.preventDefault()` and `e.stopPropagation()`
7. **Add `onSubmitInvalid`** for debugging validation errors

**Before:**
```tsx
<form.Field
  name="email"
  validators={{ onChange: emailSchema }}
  children={(field) => (
    <div>
      <input className="border-line px-4 py-3 w-full rounded-lg" {...field} />
      {field.state.meta.isTouched && !field.state.meta.isValid && field.state.meta.errors?.length > 0 && (
        <p className="text-red-600">{field.state.meta.errors.join(", ")}</p>
      )}
    </div>
  )}
/>
```

**After:**
```tsx
import { FieldInfo } from '@/components/Form/FieldInfo';

<form.Field
  name="email"
  children={(field) => {
    const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
    
    return (
      <div>
        <input 
          className={`border-line px-4 py-3 w-full rounded-lg ${
            hasError ? 'border-red-600' : ''
          }`}
          {...field}
        />
        <FieldInfo field={field} />
      </div>
    );
  }}
/>
```

See `src/forms/RegisterForm.tsx` for a complete implementation example.
