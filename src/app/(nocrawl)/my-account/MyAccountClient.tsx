'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import { useAccountStore } from '@/store/accountStore';
import MyReturns from '@/components/MyAccount/MyReturns';
import Sidebar from '@/components/MyAccount/Sidebar';
import Dashboard from '@/components/MyAccount/Dashboard';
import HistoryOrders from '@/components/MyAccount/HistoryOrders';
import MyAddress from '@/components/MyAccount/MyAddress';
import Settings from '@/components/MyAccount/Settings';

const TABS = ['dashboard', 'orders', 'returns', 'address', 'setting'];

export default function MyAccountClient() {
  // Tabs live in client state, so links from emails (`/my-account?tab=returns`) pick the tab here.
  const searchParams = useSearchParams();
  const setActiveTab = useAccountStore((state) => state.setActiveTab);
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.includes(tab)) setActiveTab(tab);
  }, [searchParams, setActiveTab]);

  return (
    <>
      <div id="header" className="relative w-full">
        <Breadcrumb heading="My Account" />
      </div>
      <div className="profile-block md:py-20 py-10">
        <div className="container">
          <div className="content-main flex gap-y-8 max-md:flex-col w-full">
            <Sidebar />
            <div className="right md:w-2/3 w-full pl-2.5">
              <Dashboard />
              <HistoryOrders />
              <MyReturns />
              <MyAddress />
              <Settings />
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
