import React from "react";
import Benefit from "@/components/Home1/Benefit";
import TrendingNow from '@/components/Home9/TrendingNow';
import HomeClient from './HomeClient';

export default function Home() {
    return (
        <>
            <TrendingNow />

            {/* Product sections fetched from API */}
            <HomeClient />
            {/* <Testimonial data={testimonialData} limit={5} /> */}
            <Benefit props="md:py-20 py-10" />
            {/* <ModalNewsletter /> */}
        </>
    );
}
