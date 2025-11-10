"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { loginSchema, LoginInput } from "@/libs/schemas/auth.schema";
import { credentialsLogin } from "@/actions/login";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { FieldInfo } from "@/components/Form/FieldInfo";

interface LoginFormProps {
  onLoginSuccess?: () => void;
  redirectPath?: string;
}

export default function LoginForm({ onLoginSuccess, redirectPath }: LoginFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    } as LoginInput,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const result = await credentialsLogin(
          value.email,
          value.password,
          value.rememberMe
        );

        if (result.success) {
          const nextRoute = redirectPath && result.emailVerified ? redirectPath : "/";

          if (!result.emailVerified) {
            router.push("/verify-otp");
          } else {
            if (redirectPath) {

              router.push(nextRoute);
            }
          }

          onLoginSuccess?.();
          router.refresh();
        } else {
          setSubmitError(result.error || "Invalid credentials. Please try again.");
        }
      } catch (error) {
        console.error("Login error:", error);
        setSubmitError("Invalid credentials. Please try again.");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="md:mt-7 mt-4">
      {/* Email */}
      <form.Field name="email">
        {(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div>
              <input
                className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${hasError ? "border-red-600" : ""
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
      </form.Field>

      {/* Password */}
      <form.Field name="password">
        {(field) => {
          const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="mt-5">
              <input
                className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${hasError ? "border-red-600" : ""
                  }`}
                id={field.name}
                name={field.name}
                type="password"
                placeholder="Password *"
                autoComplete="current-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldInfo field={field} />
            </div>
          );
        }}
      </form.Field>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between mt-5">
        <form.Field name="rememberMe">
          {(field) => (
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
              <label htmlFor={field.name} className="pl-2 cursor-pointer">
                Remember me
              </label>
            </div>
          )}
        </form.Field>
        <Link href="/forgot-password" className="font-semibold text-sm hover:underline">
          Forgot Your Password?
        </Link>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mt-5">
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="block-button md:mt-7 mt-4">
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="button-main w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          )}
        </form.Subscribe>
      </div>
      <div className="mt-2 text-center text-sm text-secondary2">
        {`Don't have an account? `}
        <Link href="/register" className="text-black hover:underline">
          Register
        </Link>
      </div>
    </form>
  );
}
