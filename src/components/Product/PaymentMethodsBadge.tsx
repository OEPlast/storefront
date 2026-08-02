'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/libs/utils';

interface PaymentMethodsBadgeProps {
  title?: string;
  className?: string;
  innerClassname?: string;
}

const PaymentMethodsBadge: React.FC<PaymentMethodsBadgeProps> = ({
  title = 'Guaranteed safe checkout',
  className = '',
  innerClassname,
}) => {
  const paymentMethods = [
    { src: '/images/payment/visa.webp', alt: 'Visa' },
    { src: '/images/payment/verve.png', alt: 'Verve' },
    { src: '/images/payment/mastercard.webp', alt: 'Mastercard' },
    { src: '/images/payment/opay.jpeg', alt: 'OPay' },
  ];

  return (
    <div className={`list-payment ${className}`}>
      <div
        className={cn(
          'main-content relative rounded-xl border border-line px-3 pb-4 pt-6 max-md:w-2/3 max-sm:w-full sm:px-4 lg:pb-6 lg:pt-8',
          innerClassname
        )}
      >
        <div className="heading6 absolute -top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-5">
          {title}
        </div>
        <div className="list grid w-full max-w-[500px] grid-cols-5 justify-self-center">
          {paymentMethods.map((method, index) => (
            <div key={index} className="item flex items-center justify-center px-1 lg:px-3">
              <Image
                src={method.src}
                width={500}
                height={450}
                alt={method.alt}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsBadge;
