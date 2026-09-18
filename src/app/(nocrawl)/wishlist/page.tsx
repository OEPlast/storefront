import React from 'react';
import type { Metadata } from 'next';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuEight from '@/components/Header/Menu/MenuEight';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import WishlistClient from './WishlistClient';

// Robots come from the (nocrawl) group layout; only the title belongs here.
export const metadata: Metadata = { title: 'Wishlist' };

const Wishlist = () => {
  return <WishlistClient />;
};

export default Wishlist;
