import Link from 'next/link';
import React from 'react';

const QuickShop = ({
  showLeadingText = true,
  className = '',
}: {
  showLeadingText?: boolean;
  className?: string;
}) => {
  return (
    <nav
      aria-label="Shop"
      className={`footer-shop-links flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line py-4 ${className}`}
    >
      {showLeadingText && <span className="text-button-uppercase mr-2">Shop:</span>}
      <Link className="caption1 duration-300 hover:underline" href={'/deals'}>
        Deals &amp; Offers
      </Link>
      <Link className="caption1 duration-300 hover:underline" href={'/new-products'}>
        New Arrivals
      </Link>
      <Link className="caption1 duration-300 hover:underline" href={'/top-sold-products'}>
        Best Sellers
      </Link>
      <Link className="caption1 duration-300 hover:underline" href={'/week-products'}>
        Top This Week
      </Link>
    </nav>
  );
};

export default QuickShop;
