'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { GetCountries } from 'react-country-state-city';
import { Country } from 'react-country-state-city/dist/esm/types';
import { useUserProfile } from '@/hooks/queries/useUserProfile';
import { useUpdateProfile, UpdateProfileInput } from '@/hooks/mutations/useUpdateProfile';
import { FieldInfo } from '@/components/Form/FieldInfo';
import { useSession } from 'next-auth/react';
import { getCdnUrl } from '@/libs/cdn-url';
import { uploadImage } from '@/libs/uploadImage';

// Zod schema for profile update validation
const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  country: z.string().min(1, 'Please select a country'),
  dob: z.string().optional(),
  notifications: z.boolean().optional(),
});

export default function ProfileInformation() {
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { data: sessionData } = useSession();
  const { data: userProfile, isLoading } = useUserProfile({ userId: sessionData?.user.id });
  const updateProfileMutation = useUpdateProfile();

  // Load countries list
  useEffect(() => {
    GetCountries().then((result) => {
      setCountriesList(result);
    });
  }, []);

  // Cleanup image preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous error
    setErrorMessage(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Only image files are allowed');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage('Image size must be less than 10MB');
      return;
    }

    // Cleanup old preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);
  };

  const form = useForm({
    defaultValues: {
      firstName: userProfile?.firstName,
      lastName: userProfile?.lastName,
      country: userProfile?.country,
      dob: userProfile?.dob,
      notifications: true,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = profileUpdateSchema.safeParse(value);
        if (!result.success) {
          return result.error.flatten().fieldErrors;
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setSuccessMessage(null);
      setErrorMessage(null);

      try {
        let updatedValues = { ...value } as UpdateProfileInput;

        // Upload image if a file is selected
        if (selectedFile) {
          try {
            const uploadedPath = await uploadImage(selectedFile, 'user');
            updatedValues.image = uploadedPath;
          } catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload image';
            setErrorMessage(message);
            return; // Stop form submission if upload fails
          }
        }

        await updateProfileMutation.mutateAsync(updatedValues);
        setSuccessMessage('Profile updated successfully!');

        // Clear image selection after successful update
        setSelectedFile(null);
        setImagePreview(null);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update profile';
        setErrorMessage(message);
      }
    },
  });

  // Update form values when user profile loads
  useEffect(() => {
    if (userProfile) {
      form.setFieldValue('firstName', userProfile.firstName || '');
      form.setFieldValue('lastName', userProfile.lastName || '');
      form.setFieldValue('country', userProfile.country || '');
      form.setFieldValue('dob', userProfile.dob || '');
      form.setFieldValue('notifications', userProfile.notifications ?? true);
    }
  }, [userProfile]);

  if (isLoading) {
    return (
      <div className="tab text-content w-full p-7 border border-line rounded-xl">
        <div className="heading5 pb-4">Information</div>
        <p className="text-secondary">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="tab text-content w-full p-7 border border-line rounded-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="heading5 pb-4">Information</div>

        {/* Avatar Upload */}
        <div className="upload_image col-span-full">
          <label htmlFor="uploadImage">
            Upload Avatar: <span className="text-red">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-5 mt-3">
            <div className="bg_img flex-shrink-0 relative w-[7.5rem] h-[7.5rem] rounded-lg overflow-hidden bg-surface">
              <span className="ph ph-image text-5xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary"></span>
              <Image
                src={imagePreview || getCdnUrl(userProfile?.image) || '/images/avatar/1.png'}
                width={300}
                height={300}
                alt="avatar"
                className="upload_img relative z-[1] w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <strong className="text-button">Upload File:</strong>
              <p className="caption1 text-secondary mt-1">JPG 120x120px (Max 10MB)</p>
              <div className="upload_file flex items-center gap-3 w-[220px] mt-3 px-3 py-2 border border-line rounded">
                <label
                  htmlFor="uploadImage"
                  className="caption2 py-1 px-3 rounded bg-line whitespace-nowrap cursor-pointer"
                >
                  Choose File
                </label>
                <input
                  type="file"
                  name="uploadImage"
                  id="uploadImage"
                  accept="image/*"
                  className="caption2 cursor-pointer"
                  onChange={handleFileSelect}
                />
              </div>
              {selectedFile && (
                <p className="caption2 text-secondary mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid sm:grid-cols-2 gap-4 gap-y-5 mt-5">
          {/* First Name */}
          <form.Field name="firstName">
            {(field) => {
              const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div className="first-name">
                  <label htmlFor="firstName" className="caption1 capitalize">
                    First Name <span className="text-red">*</span>
                  </label>
                  <input
                    className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${hasError ? 'border-red-600' : ''
                      }`}
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>

          {/* Last Name */}
          <form.Field name="lastName">
            {(field) => {
              const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div className="last-name">
                  <label htmlFor="lastName" className="caption1 capitalize">
                    Last Name <span className="text-red">*</span>
                  </label>
                  <input
                    className={`border-line mt-2 px-4 py-3 w-full rounded-lg ${hasError ? 'border-red-600' : ''
                      }`}
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>

          {/* Country */}
          <form.Field name="country">
            {(field) => {
              const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <div className="country">
                  <label htmlFor="country" className="caption1 capitalize">
                    Country <span className="text-red">*</span>
                  </label>
                  <div className="select-block mt-2">
                    <select
                      className={`border border-line px-4 py-3 w-full rounded-lg ${hasError ? 'border-red-600' : ''
                        }`}
                      id="country"
                      name="country"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      <option value="">Select Country</option>
                      {countriesList.map((country) => (
                        <option value={country.name} key={country.id}>
                          {country.emoji} {country.name}
                        </option>
                      ))}
                    </select>
                    <Icon.CaretDown className="arrow-down text-lg" />
                  </div>
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>

          {/* Date of Birth */}
          <form.Field name="dob">
            {(field) => {
              return (
                <div className="birth">
                  <label htmlFor="birth" className="caption1">
                    Day of Birth
                  </label>
                  <input
                    className="border-line mt-2 px-4 py-3 w-full rounded-lg"
                    id="birth"
                    type="date"
                    placeholder="Day of Birth"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldInfo field={field} />
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mt-5 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Submit Button */}
        <div className="block-button mt-5">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="button-main disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {selectedFile ? 'Uploading & Saving...' : 'Saving...'}
                  </span>
                ) : (
                  'Save Change'
                )}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
