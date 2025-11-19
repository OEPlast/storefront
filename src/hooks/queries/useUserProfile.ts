'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

export interface UserProfile {
  firstName: string;
  lastName: string;
  image?: string;
  country?: string;
  dob?: string;
  notifications?: boolean;
}

/**
 * React Query hook to fetch user profile data
 * @returns Query result with user profile data
 */
export const useUserProfile = ({ userId }: { userId?: string }) => {
  return useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.get<UserProfile>(api.user.profile);
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on failure to prevent infinite loading
    refetchOnWindowFocus: false,
    enabled: !!userId,
  });
};
