import { z } from "zod";
import type { Address } from "@/types/user";

// ── Shared address schema — used for BOTH shipping and billing ───────────────
export const addressSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Enter a valid phone number")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
  address1: z
    .string()
    .trim()
    .min(1, "Street address is required")
    .max(200, "Street address is too long"),
  // Required key with an allowed empty string — NOT .optional() and NOT .default().
  // Keeps the controlled input's value a `string` and keeps z.input === z.infer,
  // which @tanstack/react-form's defaultValues typing depends on.
  address2: z.string().max(200, "Address line 2 is too long"),
  city: z.string().trim().min(1, "City is required").max(100, "City is too long"),
  state: z.string().trim().min(1, "State is required"),
  lga: z.string().trim().min(1, "Local government area is required"),
  zipCode: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .max(20, "Postal code is too long"),
  country: z.string().trim().min(1, "Country is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type CheckoutAddress = z.infer<typeof addressSchema>;

/** The ONE literal every address state / reset must start from. */
export const EMPTY_CHECKOUT_ADDRESS: CheckoutAddress = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  lga: "",
  zipCode: "",
  country: "Nigeria",
  latitude: undefined,
  longitude: undefined,
};

/**
 * Saved Address -> CheckoutAddress. Never sets email (contact owns that now) and
 * carries latitude/longitude through. Coordinates are gated on `typeof === 'number'`
 * so a legitimate 0 survives the copy.
 *
 * Pure field mapping only: whether the saved country is actually serviceable is a
 * logistics-config question and stays in the controller.
 */
export function addressFromSavedAddress(address: Address): CheckoutAddress {
  return {
    firstName: address.firstName ?? "",
    lastName: address.lastName ?? "",
    phoneNumber: address.phoneNumber ?? "",
    address1: address.address1 ?? "",
    address2: address.address2 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    lga: address.lga ?? "",
    zipCode: address.zipCode ?? "",
    country: address.country ?? "",
    latitude: typeof address.latitude === "number" ? address.latitude : undefined,
    longitude: typeof address.longitude === "number" ? address.longitude : undefined,
  };
}

// ── Discount code ───────────────────────────────────────────────────────────
export const couponCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Enter a valid discount code")
    .max(32, "Discount code is too long"),
});

export type CouponCodeInput = z.infer<typeof couponCodeSchema>;

// ── Whole-form schema ───────────────────────────────────────────────────────
export const checkoutFormSchema = z
  .object({
    deliveryType: z.enum(["shipping", "pickup", "gig"]),
    /** Contact email. Login is required, so in practice this is the session email. */
    email: z.string().trim().email("Invalid email address"),
    /** Absent for pickup. Required otherwise (enforced in superRefine). */
    shippingAddress: addressSchema.optional(),
    billingSameAsShipping: z.boolean(),
    /** Required when billingSameAsShipping is false (enforced in superRefine). */
    billingAddress: addressSchema.optional(),
    notes: z.string().max(1000, "Notes are too long"),
    saveShippingAddressToAccount: z.boolean(),
  })
  .superRefine((value, ctx) => {
    // R1 — a shipping address is mandatory for every non-pickup delivery type.
    if (value.deliveryType !== "pickup" && !value.shippingAddress) {
      ctx.addIssue({
        code: "custom",
        message: "Shipping address is required",
        path: ["shippingAddress"],
      });
    }
    // R2 — GIG cannot be quoted without coordinates. 0 is a legal coordinate:
    //      test with typeof === 'number', never with truthiness.
    if (value.deliveryType === "gig") {
      if (
        typeof value.shippingAddress?.latitude !== "number" ||
        typeof value.shippingAddress?.longitude !== "number"
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "We could not locate this address. Please refine it and try again.",
          path: ["shippingAddress", "latitude"],
        });
      }
    }
    // R3 — the backend REJECTS billingSameAsShipping:false with no billingAddress.
    if (!value.billingSameAsShipping && !value.billingAddress) {
      ctx.addIssue({
        code: "custom",
        message: "Billing address is required",
        path: ["billingAddress"],
      });
    }
  });

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

// ── Error projection consumed by every section component ────────────────────
export type AddressFieldErrors = Partial<Record<keyof CheckoutAddress, string>>;

export interface CheckoutFieldErrors {
  email?: string;
  shippingAddress?: AddressFieldErrors;
  billingAddress?: AddressFieldErrors;
  /** Form-level message not attributable to a single field. */
  form?: string;
}

const ADDRESS_FIELD_KEYS = Object.keys(addressSchema.shape) as Array<
  keyof CheckoutAddress
>;

function isAddressFieldKey(segment: PropertyKey): segment is keyof CheckoutAddress {
  return (
    typeof segment === "string" &&
    ADDRESS_FIELD_KEYS.indexOf(segment as keyof CheckoutAddress) !== -1
  );
}

/** Runs checkoutFormSchema and flattens ZodError into CheckoutFieldErrors. */
export function validateCheckoutForm(
  value: CheckoutFormInput
):
  | { success: true; data: CheckoutFormInput }
  | { success: false; errors: CheckoutFieldErrors } {
  const result = checkoutFormSchema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: CheckoutFieldErrors = {};

  // First message per field wins — later issues on the same field are duplicates
  // of the same input problem and would only churn the rendered text.
  const setFormError = (message: string) => {
    if (errors.form === undefined) errors.form = message;
  };

  const setAddressError = (
    group: "shippingAddress" | "billingAddress",
    field: keyof CheckoutAddress,
    message: string
  ) => {
    const bucket: AddressFieldErrors = errors[group] ?? {};
    if (bucket[field] === undefined) bucket[field] = message;
    errors[group] = bucket;
  };

  for (let i = 0; i < result.error.issues.length; i += 1) {
    const issue = result.error.issues[i];
    const [root, child] = issue.path;

    if (root === "email") {
      if (errors.email === undefined) errors.email = issue.message;
      continue;
    }

    if (root === "shippingAddress" || root === "billingAddress") {
      if (isAddressFieldKey(child)) {
        setAddressError(root, child, issue.message);
      } else {
        // Whole-object issue (R1 / R3): no single field owns it, so it surfaces
        // as the form-level message rather than being silently dropped.
        setFormError(issue.message);
      }
      continue;
    }

    // deliveryType / billingSameAsShipping / notes / saveShippingAddressToAccount
    // and any path-less issue have no dedicated slot in CheckoutFieldErrors.
    setFormError(issue.message);
  }

  return { success: false, errors };
}
