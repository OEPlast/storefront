'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { isAuthPagePath } from '@/components/Auth/loginDestination';

type FooterAccountLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'>;

// Crawlable '/my-account' link. Logged-out visitors get the login popup
// (then continue to '/my-account') instead of a server redirect to /login.
const FooterAccountLink = ({ onClickCapture, children, ...props }: FooterAccountLinkProps) => {
  const { status } = useSession();
  const pathname = usePathname();
  const { openLoginModal } = useLoginModalStore();

  // Capture phase: React's root capture listener runs before the native click
  // listener NextTopLoader attaches to every <a>, so stopping propagation here
  // keeps a popup-only click from starting a progress bar that never finishes.
  const handleClickCapture = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClickCapture?.(e);
    if (e.defaultPrevented) return;

    // Let modified clicks (new tab / window) keep their native behaviour
    const isModifiedClick = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

    // The page-based auth flow keeps plain navigation: the popup never stacks on it
    if (status === 'unauthenticated' && !isModifiedClick && !isAuthPagePath(pathname)) {
      e.preventDefault();
      e.stopPropagation();
      openLoginModal('/my-account');
    }
  };

  return (
    <Link {...props} href={'/my-account'} onClickCapture={handleClickCapture}>
      {children}
    </Link>
  );
};

export default FooterAccountLink;
