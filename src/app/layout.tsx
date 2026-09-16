import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import '@/styles/styles.scss';
import GlobalProvider from './GlobalProvider';
import CountdownTimeType from '@/types/CountdownType';
import { countdownTime } from '@/store/countdownTime';
import NextTopLoader from 'nextjs-toploader';
import AppChrome from './AppChrome';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuEight from '@/components/Header/Menu/MenuEight';
import Footer from '@/components/Footer/Footer';
import ModalCart from '@/components/Modal/ModalCart';
import ModalWishlist from '@/components/Modal/ModalWishlist';
import ModalQuickview from '@/components/Modal/ModalQuickview';
import ModalCompare from '@/components/Modal/ModalCompare';
import ModalLogin from '@/components/Modal/ModalLogin';
import SliderOrganic from '@/components/Slider/SliderOrganic';
import { getDefaultMetadata, PrefetchImages } from '@/libs/seo';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';
import { StoreConfigProvider } from '@/context/StoreConfigContext';
import { siteConfig } from '@/config/siteConfig';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  injectStructuredData,
} from '@/libs/structured-data';
import 'react-quill-new/dist/quill.snow.css';
import 'react-lazy-load-image-component/src/effects/blur.css';

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [branding, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);
  // The top bar only states offers the checkout actually applies.
  const slogan = shipping.freeShippingThreshold
    ? `Free delivery on orders over ${formatNaira(shipping.freeShippingThreshold)}`
    : `Delivery across ${siteConfig.country}`;

  return (
    <GlobalProvider>
      <StoreConfigProvider branding={branding}>
        <html lang="en">
          <head>
            <PrefetchImages />
            {/* Global structured data: Organization (brand entity) + WebSite (Sitelinks Search Box) */}
            {injectStructuredData(generateOrganizationSchema(branding), 'ld-organization')}
            {injectStructuredData(generateWebsiteSchema(), 'ld-website')}
          </head>
          <body className={instrument.className}>
            <NextTopLoader
              color="#81e62e"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
            />
            <AppChrome>
              <TopNavOne
                props="style-one bg-black"
                slogan={slogan}
              />
              <div id="header" className="style-nine relative w-full">
                <MenuEight />
                <SliderOrganic />
              </div>
              <ModalCart serverTimeLeft={serverTimeLeft} />
              <ModalWishlist />
              <ModalQuickview />
              <ModalCompare />
            </AppChrome>
            {children}
            {/* Outside AppChrome on purpose. The popup is an overlay, not page chrome: it renders
                nothing until opened, and checkout (a chrome-free route) needs it. Inside AppChrome
                it was never mounted there, so "Sign In" set isOpen and nothing appeared — and the
                stale isOpen then popped the dialog open on the next page that had chrome. */}
            <ModalLogin />
            <AppChrome>
              <Footer />
            </AppChrome>
          </body>
        </html>
      </StoreConfigProvider>
    </GlobalProvider>
  );
}
