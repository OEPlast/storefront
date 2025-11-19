'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useAccountStore } from '@/store/accountStore';
import { signOut, useSession } from 'next-auth/react';
import { SignOutIcon } from '@phosphor-icons/react';
import { useUserProfile } from '@/hooks/queries/useUserProfile';
import { getCdnUrl } from '@/libs/cdn-url';

export default function Sidebar() {
  const { activeTab, setActiveTab } = useAccountStore();
  const { data: session } = useSession();
  const { data: userProfile, isLoading } = useUserProfile({ userId: session?.user.id });

  // Construct full name
  const fullName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : 'Loading...';

  // Get email from session
  const email = session?.user?.email || '';

  // Get avatar image
  const avatarImage = userProfile?.image || session?.user?.image || '/images/avatar/1.png';

  return (
    <div className="left md:w-1/3 w-full xl:pr-[3.125rem] lg:pr-[28px] md:pr-[16px]">
      <div className="user-infor bg-surface lg:px-7 px-4 lg:py-10 py-5 md:rounded-[20px] rounded-xl">
        <div className="heading flex flex-col items-center justify-center">
          <div className="avatar">
            <Image
              src={getCdnUrl(avatarImage)}
              width={300}
              height={300}
              alt="avatar"
              className="md:w-[140px] w-[120px] md:h-[140px] h-[120px] rounded-full object-cover"
            />
          </div>
          <div className="name heading6 mt-4 text-center">{fullName}</div>
          <div className="mail heading6 font-normal normal-case text-secondary text-center mt-1">
            {email}
          </div>
        </div>
        <div className="menu-tab w-full max-w-none lg:mt-10 mt-6">
          <Link
            href={'#!'}
            scroll={false}
            className={`item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white ${activeTab === 'dashboard' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Icon.HouseLine size={20} />
            <strong className="heading6">Dashboard</strong>
          </Link>
          <Link
            href={'#!'}
            scroll={false}
            className={`item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white mt-1.5 ${activeTab === 'orders' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('orders')}
          >
            <Icon.Package size={20} />
            <strong className="heading6">Orders</strong>
          </Link>
          <Link
            href={'#!'}
            scroll={false}
            className={`item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white mt-1.5 ${activeTab === 'address' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('address')}
          >
            <Icon.Tag size={20} />
            <strong className="heading6">My Address</strong>
          </Link>
          <Link
            href={'#!'}
            scroll={false}
            className={`item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white mt-1.5 ${activeTab === 'setting' ? 'active' : ''
              }`}
            onClick={() => setActiveTab('setting')}
          >
            <Icon.GearSix size={20} />
            <strong className="heading6">Setting</strong>
          </Link>
          <div
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="item flex items-center gap-3 w-full px-5 py-4 rounded-lg cursor-pointer duration-300 hover:bg-white mt-1.5"
          >
            <SignOutIcon size={20} />
            <strong className="heading6">Logout</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
