import { useUserProfile } from '@/hooks/queries/useUserProfile';
import useLoginPopup from '@/store/useLoginPopup';
import { UserIcon as UI_UserICon, CircleNotch } from '@phosphor-icons/react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';
import Image from 'next/image';
import { getCdnUrl } from '@/libs/cdn-url';

const UserIcon = () => {
    const { openLoginPopup, handleLoginPopup } = useLoginPopup();
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

    return (

        <div className="user-icon flex items-center justify-center cursor-pointer">
            <UI_UserICon size={24} color='black' onClick={handleLoginPopup} />
            <div
                className={`login-popup absolute top-[74px] w-[320px] p-7 rounded-xl bg-white box-shadow-sm 
                                            ${openLoginPopup ? 'open' : ''}`}
            >
                <Link href={'/login'} className="button-main w-full text-center">Login</Link>
                <div className="text-secondary text-center mt-3 pb-4">{`Don't have an account?`}
                    <Link href={'/register'} className='text-black pl-1 hover:underline'>Register</Link>
                </div>
                <div className="bottom pt-4 border-t border-line"></div>
                <Link href={'#!'} className='body1 hover:underline'>Support</Link>
            </div>
        </div>
    );
};

export default UserIcon;