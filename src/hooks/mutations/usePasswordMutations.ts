import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

interface SetPasswordInput {
  newPassword: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

const setPassword = async (input: SetPasswordInput): Promise<void> => {
  await apiClient.post(api.auth.setPassword, input);
};

/** Returns the replacement session token: changing the password revokes every older one. */
const changePassword = async (input: ChangePasswordInput): Promise<string | undefined> => {
  const response = await apiClient.post<{ token: string }>(api.auth.changePassword, input);
  return response.data?.token;
};

export const useSetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setPassword,
    onSuccess: () => {
      // Refetch password status to update UI from "Set Password" to "Change Password"
      queryClient.invalidateQueries({ queryKey: ['passwordStatus'] });
    },
  });
};

export const useChangePassword = () => {
  const { data: session, update } = useSession();

  return useMutation({
    mutationFn: changePassword,
    onSuccess: async (token) => {
      // Keep this device signed in. The spread matters: the jwt callback reads every field it
      // copies from the update payload, so a partial user object would drop emailVerified.
      if (token && session) {
        await update({ ...session, user: { ...session.user, token } });
      }
    },
  });
};
