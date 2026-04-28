import React from 'react';
import Image from 'next/image';
import Link from 'next/link';


import { useGroupedBanners } from '@/hooks/queries/useBanners';
import { getCdnUrl } from '@/libs/cdn-url';


const CatD_Banner = () => {
    const { data: banners, isFetching, isLoading } = useGroupedBanners(true);
    const CAT_D_Banners = banners?.D.slice(0, 1) || [];

    if (CAT_D_Banners.length === 0) {
        return null;
    }

    return (
        <>
            <div className="banner-block style-toys-kids mt-12 mb-4">
                <div className="container">
                    <div className="content md:rounded-[28px] rounded-2xl overflow-hidden relative">
                        <Image
                            src={getCdnUrl(CAT_D_Banners[0].imageUrl)}
                            width={3000}
                            height={2000}
                            alt='bg'
                            priority={true}
                            className='absolute top-0 left-0 w-full h-full object-cover z-[-1]'
                        />
                        <div className="text-content xl:w-1/3 w-2/3 xl:pl-[120px] md:pl-20 pl-10 md:py-[85px] py-12">
                            <div className="text-sub-display">{CAT_D_Banners[0].headerText || ''}</div>
                            <div className="heading2 md:mt-4 mt-2">{CAT_D_Banners[0].mainText || ''}</div>
                            <Link href='/shop/breadcrumb-img' className="button-main md:mt-7 mt-3">{CAT_D_Banners[0].CTA || 'Shop Now'}</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CatD_Banner;