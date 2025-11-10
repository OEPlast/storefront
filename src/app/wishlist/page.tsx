import React from 'react';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuOne from '@/components/Header/Menu/MenuOne';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import WishlistClient from './WishlistClient';

const Wishlist = () => {
    return (
        <>
            <div className='py-14 px-4 md:px-8 lg:px-16'>
                <div className="heading2 text-center">Wishlist</div>
            </div>
            <WishlistClient />
        </>
    );
};

export default Wishlist;