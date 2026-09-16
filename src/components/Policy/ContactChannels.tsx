import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { StoreBranding } from '@/libs/storeBranding';

/** wa.me wants the number as digits only, country code included, no "+". */
export const whatsappUrl = (number: string): string => `https://wa.me/${number.replace(/\D/g, '')}`;

interface ContactChannelsProps {
  branding: StoreBranding;
  className?: string;
  /** Smaller text and no labels, for the footer. */
  compact?: boolean;
}

/**
 * Every way to reach the store, from Store Settings. A channel that isn't set is left out, so
 * the page never shows an empty "Phone:" line; with nothing set, it says so plainly.
 */
export default function ContactChannels({ branding, className = '', compact = false }: ContactChannelsProps) {
  const { supportEmail, supportPhone, whatsappNumber, addressLine, supportHours } = branding;

  const channels = [
    supportEmail && {
      key: 'email',
      icon: <Icon.EnvelopeSimple size={22} />,
      label: 'Email',
      value: supportEmail,
      href: `mailto:${supportEmail}`,
    },
    whatsappNumber && {
      key: 'whatsapp',
      icon: <Icon.WhatsappLogo size={22} />,
      label: 'WhatsApp',
      value: whatsappNumber,
      href: whatsappUrl(whatsappNumber),
    },
    supportPhone && {
      key: 'phone',
      icon: <Icon.Phone size={22} />,
      label: 'Phone',
      value: supportPhone,
      href: `tel:${supportPhone.replace(/\s/g, '')}`,
    },
    addressLine && {
      key: 'address',
      icon: <Icon.MapPin size={22} />,
      label: 'Address',
      value: addressLine,
      href: null,
    },
    supportHours && {
      key: 'hours',
      icon: <Icon.Clock size={22} />,
      label: 'Hours',
      value: supportHours,
      href: null,
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; value: string; href: string | null }[];

  if (channels.length === 0) {
    return compact ? null : <p className={`body1 text-secondary ${className}`}>Contact details are coming soon.</p>;
  }

  const valueClass = compact ? 'caption1 text-black' : 'body1 text-secondary';

  return (
    <ul className={`${compact ? 'space-y-2.5' : 'space-y-4'} ${className}`}>
      {channels.map((channel) => (
        <li key={channel.key} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0" aria-hidden={compact}>{channel.icon}</span>
          <div className="min-w-0">
            <div className={compact ? 'sr-only' : 'text-button'}>{channel.label}</div>
            {channel.href ? (
              <a
                href={channel.href}
                className={`${valueClass} break-words hover:text-black hover:underline`}
                {...(channel.key === 'whatsapp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {channel.value}
              </a>
            ) : (
              <p className={`${valueClass} break-words`}>{channel.value}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
