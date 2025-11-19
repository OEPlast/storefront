import { baseApiClient } from '@/libs/api/axios';
import { APIRoutes } from '@/libs/apiRoutes';

interface UploadResponse {
  message: string;
  data: {
    path: string;
    url?: string;
    size: number;
    mimetype: string;
    originalName: string;
  };
}

/**
 * Upload an image file to the backend
 * @param file - The image file to upload
 * @param category - The upload category (default: 'user')
 * @returns The uploaded file path (relative path for storage in DB)
 */
export async function uploadImage(file: File, category: string = 'user'): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (10MB max, matching backend limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  try {
    // Upload to backend
    const response = await baseApiClient.post<UploadResponse>(
      APIRoutes.uploadSingleFile,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Return the path from response
    if (!response.data.data?.path) {
      throw new Error('Upload failed: No path returned from server');
    }

    return response.data.data.path;
  } catch (error) {
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image');
  }
}
