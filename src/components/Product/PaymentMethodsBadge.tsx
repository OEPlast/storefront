'use client';

import React from 'react';
import Image from 'next/image';

interface PaymentMethodsBadgeProps {
    title?: string;
    className?: string;
}

const PaymentMethodsBadge: React.FC<PaymentMethodsBadgeProps> = ({
    title = "Guaranteed safe checkout",
    className = ""
}) => {
    const paymentMethods = [
        { src: '/images/payment/visa.webp', alt: 'Visa' },
        { src: '/images/payment/verve.png', alt: 'Verve' },
        { src: '/images/payment/mastercard.webp', alt: 'Mastercard' },
        { src: '/images/payment/opay.jpeg', alt: 'OPay' },
        { src: '/images/payment/paystack.png', alt: 'Paystack' },
    ];

    return (
        <div className={`list-payment ${className}`}>
            <div className="main-content lg:pt-8 pt-6 lg:pb-6 pb-4 sm:px-4 px-3 border border-line rounded-xl relative max-md:w-2/3 max-sm:w-full">
                <div className="heading6 px-5 bg-white absolute -top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                    {title}
                </div>
                <div className="list grid grid-cols-5 w-full max-w-[500px] justify-self-center">
                    {paymentMethods.map((method, index) => (
                        <div key={index} className="item flex items-center justify-center lg:px-3 px-1">
                            <Image
                                src={method.src}
                                width={500}
                                height={450}
                                alt={method.alt}
                                className='w-full'
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodsBadge;
