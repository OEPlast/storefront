import React from 'react';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';
import { siteConfig } from '@/config/siteConfig';

interface Props {
  props: string;
}

/** Homepage promise strip. Every line reads from Store Settings or the delivery config, so it can't promise more than the store does. */
const Benefit = async ({ props }: Props) => {
  const [{ policies, supportHours }, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);

  const items = [
    {
      icon: 'icon-phone-call',
      title: 'Customer Support',
      text: supportHours
        ? `Questions about an order? Reach us on WhatsApp or email, ${supportHours}.`
        : 'Questions about an order? Reach us on WhatsApp or email and we’ll help.',
    },
    {
      icon: 'icon-return',
      title: `${policies.returnWindowDays}-Day Returns`,
      text: `Not right? Request a return within ${policies.returnWindowDays} days of delivery for a refund.`,
    },
    {
      icon: 'icon-guarantee',
      title: 'Secure Checkout',
      text: 'Pay safely by card, transfer or USSD with Paystack. We never see your card details.',
    },
    {
      icon: 'icon-delivery-truck',
      title: 'Shipping Nationwide',
      text: shipping.freeShippingThreshold
        ? `Delivery across ${siteConfig.country}, free on orders over ${formatNaira(shipping.freeShippingThreshold)}.`
        : `Tracked delivery to homes and offices across ${siteConfig.country}.`,
    },
  ];

  return (
    <div className="container">
      <div className={`benefit-block ${props}`}>
        <div className="list-benefit grid grid-cols-2 items-start gap-[30px] lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="benefit-item flex flex-col items-center justify-center">
              <i className={`${item.icon} text-5xl lg:text-7xl`}></i>
              <div className="heading6 mt-5 text-center">{item.title}</div>
              <div className="caption1 mt-3 text-center text-secondary">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Benefit;
