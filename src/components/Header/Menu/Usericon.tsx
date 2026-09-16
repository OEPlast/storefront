import { useUserProfile } from '@/hooks/queries/useUserProfile';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { UserIcon as UI_UserICon, CircleNotch } from '@phosphor-icons/react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React, { memo } from 'react';
import Image from 'next/image';
import { getCdnUrl } from '@/libs/cdn-url';
import { isAuthPagePath } from '@/components/Auth/loginDestination';

const UserIcon = () => {
  const { openLoginModal } = useLoginModalStore();
  const pathname = usePathname();
  const { status, data } = useSession();
  const {
    data: userProfile,
    isLoading,
    isFetching,
    isError,
  } = useUserProfile({ userId: data?.user.id });
  const isUserDataLoading = isLoading || isFetching;

  if (status === 'loading' || (status === 'authenticated' && isUserDataLoading)) {
    return (
      <div className="user-icon flex items-center justify-center">
        <CircleNotch size={24} color="gray" className="animate-spin" />
      </div>
    );
  }

  // If authenticated but profile fetch failed or no profile data, show generic user icon with link
  if (status === 'authenticated' && (isError || !userProfile)) {
    return (
      <Link
        href="/my-account"
        className="user-icon flex cursor-pointer items-center justify-center"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
          <span className="text-sm font-medium text-gray-700">U</span>
        </div>
      </Link>
    );
  }

  if (status === 'authenticated' && userProfile) {
    return (
      <Link
        href="/my-account"
        className="user-icon flex h-[30px] w-[30px] cursor-pointer items-center justify-center overflow-hidden rounded-full"
      >
        {userProfile.image ? (
          <Image
            src={getCdnUrl(userProfile.image)}
            alt="User profile"
            width={30}
            height={30}
            className="w-full rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {userProfile.firstName?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
      </Link>
    );
  }

  // Already on the login page: the icon stays visible but is inert (no dead focusable control)
  if (pathname === '/login') {
    return (
      <span className="user-icon flex items-center justify-center" aria-hidden="true">
        <UI_UserICon size={24} color="black" />
      </span>
    );
  }

  // On the rest of the page-based auth flow, route to the login page instead of opening the popup
  if (isAuthPagePath(pathname)) {
    return (
      <Link
        href="/login"
        aria-label="Log in or create an account"
        className="user-icon flex cursor-pointer items-center justify-center"
      >
        <UI_UserICon size={24} color="black" />
      </Link>
    );
  }

  // Everywhere else: quick login popup, stay on the current page after signing in
  return (
    <button
      type="button"
      aria-label="Log in or create an account"
      className="user-icon flex cursor-pointer items-center justify-center"
      onClick={() => openLoginModal()}
    >
      <UI_UserICon size={24} color="black" />
    </button>
  );
};

export default memo(UserIcon);
