import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "@/styles/styles.scss";
import GlobalProvider from "./GlobalProvider";
import ModalCart from "@/components/Modal/ModalCart";
import ModalWishlist from "@/components/Modal/ModalWishlist";
import ModalQuickview from "@/components/Modal/ModalQuickview";
import ModalCompare from "@/components/Modal/ModalCompare";
import ModalLogin from "@/components/Modal/ModalLogin";
import CountdownTimeType from "@/types/CountdownType";
import { countdownTime } from "@/store/countdownTime";
import NextTopLoader from "nextjs-toploader";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuEight from "@/components/Header/Menu/MenuEight";
import SliderNine from "@/components/Slider/SliderNine";
import Footer from "@/components/Footer/Footer";
import { getDefaultMetadata, PrefetchImages } from "@/libs/seo";
import 'react-quill-new/dist/quill.snow.css';
import 'react-lazy-load-image-component/src/effects/blur.css';

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({ subsets: ["latin"] });

export const metadata: Metadata = getDefaultMetadata();

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <GlobalProvider>
      <html lang="en">
        <head>
          <PrefetchImages />
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
          <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
          <div id="header" className='relative w-full style-nine'>
            <MenuEight />
            <SliderNine />
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
    </GlobalProvider>
  );
}
