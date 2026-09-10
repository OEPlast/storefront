'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLoginModalStore } from '@/store/useLoginModalStore';

type FooterAccountLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'>;

// Crawlable '/my-account' link. Logged-out visitors get the login popup
// (then continue to '/my-account') instead of a server redirect to /login.
const FooterAccountLink = ({ onClick, children, ...props }: FooterAccountLinkProps) => {
  const { status } = useSession();
  const { openLoginModal } = useLoginModalStore();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    // Let modified clicks (new tab / window) keep their native behaviour
    const isModifiedClick = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

    if (status === 'unauthenticated' && !isModifiedClick) {
      e.preventDefault();
      openLoginModal('/my-account');
    }
  };

  return (
    <Link {...props} href={'/my-account'} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default FooterAccountLink;
