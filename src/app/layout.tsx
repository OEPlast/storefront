import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "@/styles/styles.scss";
import GlobalProvider from "./GlobalProvider";
import ModalCart from "@/components/Modal/ModalCart";
import ModalWishlist from "@/components/Modal/ModalWishlist";
import ModalSearch from "@/components/Modal/ModalSearch";
import ModalQuickview from "@/components/Modal/ModalQuickview";
import ModalCompare from "@/components/Modal/ModalCompare";
import CountdownTimeType from "@/type/CountdownType";
import { countdownTime } from "@/store/countdownTime";
import NextTopLoader from "nextjs-toploader";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuEight from "@/components/Header/Menu/MenuEight";
import SliderNine from "@/components/Slider/SliderNine";

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OEPlast",
  description: "Multipurpose eCommerce Template",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalProvider>
      <html lang="en">
        <body className={instrument.className}>
          <NextTopLoader
            color="#56ff2b"
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
          <ModalCart serverTimeLeft={serverTimeLeft} />
          <ModalWishlist />
          <ModalSearch />
          <ModalQuickview />
          <ModalCompare />
        </body>
      </html>
    </GlobalProvider>
  );
}
