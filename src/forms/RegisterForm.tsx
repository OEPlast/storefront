"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { registerSchema, RegisterInput } from "@/libs/schemas/auth.schema";
import { apiClient, handleApiError } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { GetCountries } from "react-country-state-city";
import { Country } from "react-country-state-city/dist/esm/types";
import { FieldInfo } from "@/components/Form/FieldInfo";

export default function RegisterForm() {
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    GetCountries().then((result) => {
      setCountriesList(result);
    });
  }, []);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      country: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    } as RegisterInput,
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        // Remove confirmPassword and agreeToTerms before sending to API
        const { confirmPassword, agreeToTerms, ...dataToSend } = value;

        // Make API call
        await apiClient.post(api.auth.register, dataToSend);

        // Success - redirect to login
        router.push("/login?registered=true");
      } catch (error) {
        // Log all error details for debugging
        console.error("Registration error:", error);

        // If error is AxiosError, log response data if available
        if (error && typeof error === "object" && "response" in error) {
          // @ts-expect-error: dynamic error shape
          console.error("API error response:", error.response?.data);
          // @ts-expect-error: dynamic error shape
          console.error("API error status:", error.response?.status);
          // @ts-expect-error: dynamic error shape
          console.error("API error headers:", error.response?.headers);
        }

        const errorMessage = handleApiError(error);
        setSubmitError(errorMessage);
      }

      // try {
      //   // Remove confirmPassword and agreeToTerms before sending to API
      //   const { confirmPassword, agreeToTerms, ...dataToSend } = value;

      //   // Make API call
      //   await apiClient.post(api.auth.register, dataToSend);

      //   // Success - redirect to login
      //   router.push("/login?registered=true");
      // } catch (error) {
      //   // Handle errors
      //   const errorMessage = handleApiError(error);
      //   setSubmitError(errorMessage);
      //   console.error("Registration error:", error);
      // }
    },
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation()
        form.handleSubmit();
      }}
      className="md:mt-7 mt-4">
      {/* First Name and Last Name */}
      <div className="flex gap-4 max-lg:flex-col">
        <form.Field
          name="firstName"
          children={(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="flex-1">
                <input
                  className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id={field.name}
                  name={field.name}
                  type="text"
                  placeholder="First Name *"
                  autoComplete="given-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />

        <form.Field
          name="lastName"
          children={(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="flex-1">
                <input
                  className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id={field.name}
                  name={field.name}
                  type="text"
                  placeholder="Last Name *"
                  autoComplete="family-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />
      </div>

      {/* Country */}
      <form.Field
        name="country"
        children={(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
          
          return (
            <div className="mt-5">
              <select
                className={`border border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                  hasError ? 'border-red-600' : ''
                }`}
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}>
                <option value="">Select Country *</option>
                {countriesList.map((country) => (
                  <option value={country.name} key={country.id}>
                    {country.emoji} {country.name}
                  </option>
                ))}
              </select>
              <FieldInfo field={field} />
            </div>
          );
        }}
      />

      {/* Email */}
      <form.Field
        name="email"
        children={(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
          
          return (
            <div className="mt-5">
              <input
                className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                  hasError ? 'border-red-600' : ''
                }`}
                id={field.name}
                name={field.name}
                type="email"
                placeholder="Email address *"
                autoComplete="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          );
        }}
      />

      {/* Password and Confirm Password */}
      <div className="flex gap-4 max-lg:flex-col mt-5">
        <form.Field
          name="password"
          children={(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="flex-1">
                <input
                  className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="Password *"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />

        <form.Field
          name="confirmPassword"
          children={(field) => {
            const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
            
            return (
              <div className="flex-1">
                <input
                  className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${
                    hasError ? 'border-red-600' : ''
                  }`}
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="Confirm Password *"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldInfo field={field} />
              </div>
            );
          }}
        />
      </div>

      {/* Terms Agreement */}
      <form.Field
        name="agreeToTerms"
        children={(field) => (
          <div className="mt-5">
            <div className="flex items-center">
              <div className="block-input">
                <input
                  type="checkbox"
                  id={field.name}
                  name={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <Icon.CheckSquare size={20} weight="fill" className="icon-checkbox" />
              </div>
              <label htmlFor={field.name} className="pl-2 cursor-pointer text-secondary2">
                I agree to the
                <Link href={"#!"} className="text-black hover:underline pl-1">
                  Terms of User
                </Link>
              </label>
            </div>
            <FieldInfo field={field} />
          </div>
        )}
      />

      {/* Error Message */}
      {submitError && (
        <div className="rounded-md bg-red-50 p-4 mt-5">
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="block-button md:mt-7 mt-4">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <button 
              type="submit" 
              disabled={!canSubmit || isSubmitting} 
              className="button-main w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Registering..." : "Register"}
            </button>
          )}
        />
      </div>
    </form>
  );
}
