import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import '@/styles/styles.scss';
import GlobalProvider from './GlobalProvider';
import ModalCart from '@/components/Modal/ModalCart';
import ModalWishlist from '@/components/Modal/ModalWishlist';
import ModalQuickview from '@/components/Modal/ModalQuickview';
import ModalCompare from '@/components/Modal/ModalCompare';
import ModalLogin from '@/components/Modal/ModalLogin';
import CountdownTimeType from '@/types/CountdownType';
import { countdownTime } from '@/store/countdownTime';
import NextTopLoader from 'nextjs-toploader';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuEight from '@/components/Header/Menu/MenuEight';
import SliderNine from '@/components/Slider/SliderNine';
import Footer from '@/components/Footer/Footer';
import { getDefaultMetadata, PrefetchImages } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';
import { StoreConfigProvider } from '@/context/StoreConfigContext';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  injectStructuredData,
} from '@/libs/structured-data';
import 'react-quill-new/dist/quill.snow.css';
import 'react-lazy-load-image-component/src/effects/blur.css';
import SliderOrganic from '@/components/Slider/SliderOrganic';

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getStoreBranding();

  return (
    <GlobalProvider>
      <StoreConfigProvider storeName={branding.storeName} whatsappNumber={branding.whatsappNumber}>
        <html lang="en">
          <head>
            <PrefetchImages />
            {/* Global structured data: Organization (brand entity) + WebSite (Sitelinks Search Box) */}
            {injectStructuredData(generateOrganizationSchema(), 'ld-organization')}
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
            <TopNavOne
              props="style-one bg-black"
              slogan="New customers save 10% with the code GET10"
            />
            <div id="header" className="style-nine relative w-full">
              <MenuEight />
              <SliderOrganic />
            </div>
            {children}
            <Footer />
            <ModalLogin />
            <ModalCart serverTimeLeft={serverTimeLeft} />
            <ModalWishlist />
            <ModalQuickview />
            <ModalCompare />
          </body>
        </html>
      </StoreConfigProvider>
    </GlobalProvider>
  );
}
