import React from "react";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import Collection from "@/components/Home1/Collection";
import Benefit from "@/components/Home1/Benefit";
import Brand from "@/components/Home1/Brand";
import Footer from "@/components/Footer/Footer";
import ModalNewsletter from "@/components/Modal/ModalNewsletter";
import MenuEight from "@/components/Header/Menu/MenuEight";
import SliderNine from "@/components/Slider/SliderNine";
import TrendingNow from '@/components/Home9/TrendingNow'
import HomeClient from './HomeClient';

export default function Home() {
  return (
    <>
      <TrendingNow />

      {/* Product sections fetched from API */}
      <HomeClient />

      <Collection />
      <Benefit props="md:py-20 py-10" />
      <Footer />
      <ModalNewsletter />
    </>
  );
}
