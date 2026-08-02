import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Logo from '../Logo';

const Footer = () => {
  return (
    <>
      <div id="footer" className="footer">
        <div className="footer-main bg-surface">
          <div className="container">
            <div className="content-footer flex flex-wrap justify-between gap-y-8 py-[60px]">
              <div className="company-infor basis-2/4 pr-7 max-lg:basis-full">
                <Link href={'/'} className="logo">
                  <Logo alwaysFull />
                </Link>
                <div className="mt-3 flex gap-3">
                  <div className="flex flex-col">
                    <span className="text-button">Mail:</span>
                    <span className="text-button mt-3">Phone:</span>
                    <span className="text-button mt-3">Address:</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="">Rawura@gmail.com</span>
                    <span className="mt-3">+2348028299167</span>
                    <span className="mt-3 pt-px">No 1, Abule Ojo Busstop. Lagos</span>
                  </div>
                </div>
              </div>
              <div className="right-content flex basis-2/4 flex-wrap gap-y-8 max-lg:basis-full">
                <div className="list-nav flex basis-2/4 justify-between gap-4 max-md:basis-full">
                  <div className="item flex basis-1/2 flex-col">
                    <div className="text-button-uppercase pb-3">Infomation</div>
                    <Link
                      className="caption1 has-line-before w-fit duration-300"
                      href={'/pages/contact'}
                    >
                      Contact us
                    </Link>
                    <Link
                      className="caption1 has-line-before w-fit pt-2 duration-300"
                      href={'/my-account'}
                    >
                      My Account
                    </Link>
                    <Link
                      className="caption1 has-line-before w-fit pt-2 duration-300"
                      href={'/order-tracking'}
                    >
                      Order & Returns
                    </Link>
                    <Link
                      className="caption1 has-line-before w-fit pt-2 duration-300"
                      href={'/pages/faqs'}
                    >
                      FAQs
                    </Link>
                  </div>
                  <div className="item flex basis-1/2 flex-col">
                    <div className="text-button-uppercase pb-3">Customer Services</div>
                    <Link
                      className="caption1 has-line-before w-fit pt-2 duration-300"
                      href={'/order-tracking'}
                    >
                      Order Tracking
                    </Link>
                    <Link
                      className="caption1 has-line-before w-fit pt-2 duration-300"
                      href={'/privacy-policy'}
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
                <div className="newsletter basis-2/4 pl-7 max-md:basis-full max-md:pl-0">
                  <div className="text-button-uppercase">Newletter</div>
                  <div className="caption1 mt-3">
                    Sign up for our newsletter and get 10% off your first purchase
                  </div>
                  <div className="input-block mt-4 h-[52px] w-full">
                    <form className="relative h-full w-full" action="post">
                      <input
                        type="email"
                        placeholder="Enter your e-mail"
                        className="caption1 h-full w-full rounded-xl border border-line pl-4 pr-14"
                        required
                      />
                      <button className="absolute right-1 top-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-black">
                        <Icon.ArrowRight size={24} color="#fff" />
                      </button>
                    </form>
                  </div>
                  <div className="list-social mt-4 flex items-center gap-6">
                    <Link href={'https://www.facebook.com/'} target="_blank">
                      <div className="icon-facebook text-2xl text-black"></div>
                    </Link>
                    <Link href={'https://www.instagram.com/'} target="_blank">
                      <div className="icon-instagram text-2xl text-black"></div>
                    </Link>
                    <Link href={'https://www.twitter.com/'} target="_blank">
                      <div className="icon-twitter text-2xl text-black"></div>
                    </Link>
                    <Link href={'https://www.youtube.com/'} target="_blank">
                      <div className="icon-youtube text-2xl text-black"></div>
                    </Link>
                    <Link href={'https://www.pinterest.com/'} target="_blank">
                      <div className="icon-pinterest text-2xl text-black"></div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {/* Internal-linking hubs: crawlable links that distribute authority to
                shopping surfaces (SEO Phase 4). */}
            <nav
              aria-label="Shop"
              className="footer-shop-links flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line py-4"
            >
              <span className="text-button-uppercase mr-2">Shop:</span>
              <Link className="caption1 duration-300 hover:underline" href={'/deals'}>
                Deals &amp; Offers
              </Link>
              <Link className="caption1 duration-300 hover:underline" href={'/new-products'}>
                New Arrivals
              </Link>
              <Link className="caption1 duration-300 hover:underline" href={'/top-sold-products'}>
                Best Sellers
              </Link>
              <Link className="caption1 duration-300 hover:underline" href={'/week-products'}>
                Top This Week
              </Link>
              <Link className="caption1 duration-300 hover:underline" href={'/blog'}>
                Blog
              </Link>
            </nav>
            <div className="footer-bottom flex items-center justify-between gap-5 border-t border-line py-3 max-lg:flex-col max-lg:justify-center">
              <div className="left flex items-center gap-8">
                <div className="copyright caption1 text-secondary">
                  ©{new Date().getFullYear()} Rawura. All Rights Reserved.
                </div>
                <div className="select-block flex items-center gap-5 max-md:hidden">
                  <div className="choose-language flex items-center gap-1.5">
                    <select
                      name="language"
                      id="chooseLanguageFooter"
                      className="caption2 bg-transparent"
                    >
                      <option value="English">English</option>
                    </select>
                    <Icon.CaretDown size={12} color="#1F1F1F" />
                  </div>
                  <div className="choose-currency flex items-center gap-1.5">
                    <select
                      name="currency"
                      id="chooseCurrencyFooter"
                      className="caption2 bg-transparent"
                    >
                      <option value="EUR">NGN</option>
                    </select>
                    <Icon.CaretDown size={12} color="#1F1F1F" />
                  </div>
                </div>
              </div>
              <div className="right flex items-center gap-2">
                <div className="caption1 text-secondary">Payment:</div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/visa.webp'}
                    width={500}
                    height={500}
                    alt={'payment'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/verve.png'}
                    width={500}
                    height={500}
                    alt={'payment'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/mastercard.webp'}
                    width={500}
                    height={500}
                    alt={'payment'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/opay.jpeg'}
                    width={500}
                    height={500}
                    alt={'payment'}
                    className="w-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
