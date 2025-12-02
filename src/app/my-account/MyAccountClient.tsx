'use client';

import React from 'react';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Sidebar from '@/components/MyAccount/Sidebar';
import Dashboard from '@/components/MyAccount/Dashboard';
import HistoryOrders from '@/components/MyAccount/HistoryOrders';
import MyAddress from '@/components/MyAccount/MyAddress';
import Settings from '@/components/MyAccount/Settings';

export default function MyAccountClient() {

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
              <MyAddress />
              <Settings />
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
