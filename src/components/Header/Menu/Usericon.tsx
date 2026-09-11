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
<<<<<<< Updated upstream
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
=======
    const { openLoginModal } = useLoginModalStore();
    const pathname = usePathname();
    const { status, data } = useSession();
    const { data: userProfile, isLoading, isFetching, isError } = useUserProfile({ userId: data?.user.id });
    const isUserDataLoading = isLoading || isFetching;

    if (status === 'loading' || (status === 'authenticated' && isUserDataLoading)) {
        return (
            <div className="user-icon flex items-center justify-center">
                <CircleNotch size={24} color='gray' className="animate-spin" />
            </div>
        );
    }

    // If authenticated but profile fetch failed or no profile data, show generic user icon with link
    if (status === 'authenticated' && (isError || !userProfile)) {
        return (
            <Link href="/my-account" className="user-icon flex items-center justify-center cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">U</span>
                </div>
            </Link>
        );
    }

    if (status === 'authenticated' && userProfile) {
        return (
            <Link href="/my-account" className="user-icon w-[30px] h-[30px] flex items-center justify-center overflow-hidden cursor-pointer rounded-full">
                {userProfile.image ? (
                    <Image
                        src={getCdnUrl(userProfile.image)}
                        alt="User profile"
                        width={30}
                        height={30}
                        className="rounded-full object-cover w-full"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
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
                <UI_UserICon size={24} color='black' />
            </span>
        );
    }

    // On the rest of the page-based auth flow, route to the login page instead of opening the popup
    if (isAuthPagePath(pathname)) {
        return (
            <Link
                href="/login"
                aria-label="Log in or create an account"
                className="user-icon flex items-center justify-center cursor-pointer"
            >
                <UI_UserICon size={24} color='black' />
            </Link>
        );
    }
>>>>>>> Stashed changes

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
    console.log(getCdnUrl(userProfile.image)); // Debugging line to check userProfile data
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

  const isOnAuthPage = AUTH_PAGE_PATHS.includes(pathname ?? '');

  // On the page-based auth flow (other than /login itself), route to the login page instead of opening the popup
  if (isOnAuthPage && pathname !== '/login') {
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

  return (
    <button
      type="button"
      aria-label="Log in or create an account"
      className="user-icon flex cursor-pointer items-center justify-center"
      onClick={() => {
        // Already on the login page: never stack the popup on the page-based flow
        if (isOnAuthPage) return;
        // Quick login: stay on the current page after signing in
        openLoginModal();
      }}
    >
      <UI_UserICon size={24} color="black" />
    </button>
  );
};

export default memo(UserIcon);
