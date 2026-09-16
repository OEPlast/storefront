import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaInstagram, FaThreads, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import Logo from '../Logo';
import FooterAccountLink from './FooterAccountLink';
import { getStoreBranding } from '@/libs/storeBranding';
import QuickShop from '../Shop/QuickShop';
import ContactChannels, { whatsappUrl } from '../Policy/ContactChannels';
import NewsletterForm from '../Newsletter/NewsletterForm';

const Footer = async () => {
  const branding = await getStoreBranding();
  const { storeName, socialLinks } = branding;
  const socialPlatforms = [
    { key: 'facebook', icon: FaFacebookF, label: 'Facebook' },
    { key: 'instagram', icon: FaInstagram, label: 'Instagram' },
    { key: 'x', icon: FaXTwitter, label: 'X' },
    { key: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
    { key: 'threads', icon: FaThreads, label: 'Threads' },
  ] as const;

  return (
    <>
      <div id="footer" className="footer">
        <div className="footer-main bg-surface">
          <div className="container">
            <div className="content-footer flex flex-wrap justify-between gap-y-8 py-[60px]">
              <div className="company-infor basis-2/4 pr-7 max-lg:basis-full">
                <Link href={'/'} className="logo">
                  <Logo alwaysFull storeName={storeName} />
                </Link>
                <ContactChannels branding={branding} className="mt-5" compact />
              </div>
              <div className="right-content flex basis-2/4 flex-wrap gap-y-8 max-lg:basis-full">
                <div className="list-nav flex basis-2/4 justify-between gap-4 max-md:basis-full">
                  <div className="item flex basis-1/2 flex-col">
                    <div className="text-button-uppercase pb-3">Information</div>
                    {[
                      { href: '/pages/about', label: 'About us' },
                      { href: '/pages/contact', label: 'Contact us' },
                      { href: '/pages/faqs', label: 'FAQs' },
                      { href: '/pages/terms', label: 'Terms of use' },
                      { href: '/privacy-policy', label: 'Privacy policy' },
                    ].map(({ href, label }, index) => (
                      <Link key={href} className={`caption1 has-line-before w-fit duration-300 ${index ? 'pt-2' : ''}`} href={href}>
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="item flex basis-1/2 flex-col">
                    <div className="text-button-uppercase pb-3">Customer Services</div>
                    <FooterAccountLink className="caption1 has-line-before w-fit duration-300">
                      My account
                    </FooterAccountLink>
                    {[
                      { href: '/order-tracking', label: 'Track an order' },
                      { href: '/pages/shipping', label: 'Shipping & delivery' },
                      { href: '/pages/returns', label: 'Returns & refunds' },
                    ].map(({ href, label }) => (
                      <Link key={href} className="caption1 has-line-before w-fit pt-2 duration-300" href={href}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="newsletter basis-2/4 pl-7 max-md:basis-full max-md:pl-0">
                  <div className="text-button-uppercase">Newsletter</div>
                  <div className="caption1 mt-3">New arrivals, deals and restocks. No spam; unsubscribe any time.</div>
                  <NewsletterForm source="footer" className="mt-4" />
                  <div className="list-social mt-4 flex items-center gap-6">
                    {socialPlatforms.map(({ key, icon: SocialIcon, label }) => {
                      const value = socialLinks?.[key]?.trim();
                      if (!value) return null;
                      // Settings may hold a bare WhatsApp number rather than a link.
                      const href = value.startsWith('http') ? value : key === 'whatsapp' ? whatsappUrl(value) : null;
                      if (!href) return null;

                      return (
                        <Link
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                        >
                          <SocialIcon className="text-2xl text-black" aria-hidden />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <QuickShop />
            <div className="footer-bottom flex items-center justify-between gap-5 border-t border-line py-3 max-lg:flex-col max-lg:justify-center">
              <div className="left flex items-center gap-8">
                <div className="copyright caption1 text-secondary">
                  ©{new Date().getFullYear()} {storeName}. All Rights Reserved.
                </div>
              </div>
              <div className="right flex items-center gap-2">
                <div className="caption1 text-secondary">Payment:</div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/visa.webp'}
                    width={500}
                    height={500}
                    alt={'Visa'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/verve.png'}
                    width={500}
                    height={500}
                    alt={'Verve'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/mastercard.webp'}
                    width={500}
                    height={500}
                    alt={'Mastercard'}
                    className="w-9"
                  />
                </div>
                <div className="payment-img">
                  <Image
                    src={'/images/payment/opay.jpeg'}
                    width={500}
                    height={500}
                    alt={'OPay'}
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
