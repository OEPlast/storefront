import React from "react";
import type { Metadata } from 'next';
import Benefit from "@/components/HomeAndProducts/Benefit";
import TrendingNow from '@/components/HomeAndProducts/TrendingNow';
import HomeClient from './HomeClient';

// Title/description/OG are inherited from the root layout's getDefaultMetadata().
// Only the self-canonical is added here — `/` is the most-linked page on the site,
// so it should never rely on Google inferring its own canonical.
export const metadata: Metadata = {
    alternates: { canonical: '/' },
};

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
