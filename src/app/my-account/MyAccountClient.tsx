'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuOne from '@/components/Header/Menu/MenuOne';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import Sidebar from '@/components/MyAccount/Sidebar';
import Dashboard from '@/components/MyAccount/Dashboard';
import HistoryOrders from '@/components/MyAccount/HistoryOrders';
import MyAddress from '@/components/MyAccount/MyAddress';
import Settings from '@/components/MyAccount/Settings';
import { useAccountStore } from '@/store/accountStore';

export default function MyAccountClient() {
  const { openDetail, setOpenDetail } = useAccountStore();

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
      <Footer />
      <div
        className={`modal-order-detail-block flex items-center justify-center`}
        onClick={() => setOpenDetail(false)}
      >
        <div
          className={`modal-order-detail-main grid grid-cols-2 w-[1160px] bg-white rounded-2xl ${openDetail ? 'open' : ''
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="info p-10 border-r border-line">
            <h5 className="heading5">Order Details</h5>
            <div className="list_info grid grid-cols-2 gap-10 gap-y-8 mt-5">
              <div className="info_item">
                <strong className="text-button-uppercase text-secondary">Contact Information</strong>
                <h6 className="heading6 order_name mt-2">Tony nguyen</h6>
                <h6 className="heading6 order_phone mt-2">(+12) 345 - 678910</h6>
                <h6 className="heading6 normal-case order_email mt-2">hi.avitex@gmail.com</h6>
              </div>
              <div className="info_item">
                <strong className="text-button-uppercase text-secondary">Payment method</strong>
                <h6 className="heading6 order_payment mt-2">cash delivery</h6>
              </div>
              <div className="info_item">
                <strong className="text-button-uppercase text-secondary">Shipping address</strong>
                <h6 className="heading6 order_shipping_address mt-2">
                  2163 Phillips Gap Rd, West Jefferson, North Carolina, US
                </h6>
              </div>
              <div className="info_item">
                <strong className="text-button-uppercase text-secondary">Billing address</strong>
                <h6 className="heading6 order_billing_address mt-2">
                  2163 Phillips Gap Rd, West Jefferson, North Carolina, US
                </h6>
              </div>
              <div className="info_item">
                <strong className="text-button-uppercase text-secondary">Company</strong>
                <h6 className="heading6 order_company mt-2">Avitex Technology</h6>
              </div>
            </div>
          </div>
          <div className="list p-10">
            <h5 className="heading5">Items</h5>
            <div className="list_prd">
              <div className="prd_item flex flex-wrap items-center justify-between gap-3 py-5 border-b border-line">
                <Link href={'/product/default'} className="flex items-center gap-5">
                  <div className="bg-img flex-shrink-0 md:w-[100px] w-20 aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={'/images/product/1000x1000.png'}
                      width={1000}
                      height={1000}
                      alt={'Contrasting sheepskin sweatshirt'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="prd_name text-title">Contrasting sheepskin sweatshirt</div>
                    <div className="caption1 text-secondary mt-2">
                      <span className="prd_size uppercase">XL</span>
                      <span>/</span>
                      <span className="prd_color capitalize">Yellow</span>
                    </div>
                  </div>
                </Link>
                <div className="text-title">
                  <span className="prd_quantity">1</span>
                  <span> X </span>
                  <span className="prd_price">$45.00</span>
                </div>
              </div>
              <div className="prd_item flex flex-wrap items-center justify-between gap-3 py-5 border-b border-line">
                <Link href={'/product/default'} className="flex items-center gap-5">
                  <div className="bg-img flex-shrink-0 md:w-[100px] w-20 aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={'/images/product/1000x1000.png'}
                      width={1000}
                      height={1000}
                      alt={'Contrasting sheepskin sweatshirt'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="prd_name text-title">Contrasting sheepskin sweatshirt</div>
                    <div className="caption1 text-secondary mt-2">
                      <span className="prd_size uppercase">XL</span>
                      <span>/</span>
                      <span className="prd_color capitalize">White</span>
                    </div>
                  </div>
                </Link>
                <div className="text-title">
                  <span className="prd_quantity">2</span>
                  <span> X </span>
                  <span className="prd_price">$70.00</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-5">
              <strong className="text-title">Shipping</strong>
              <strong className="order_ship text-title">Free</strong>
            </div>
            <div className="flex items-center justify-between mt-4">
              <strong className="text-title">Discounts</strong>
              <strong className="order_discounts text-title">-$80.00</strong>
            </div>
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-line">
              <h5 className="heading5">Subtotal</h5>
              <h5 className="order_total heading5">$105.00</h5>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
