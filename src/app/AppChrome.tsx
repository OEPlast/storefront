'use client';

import type React from 'react';
import { usePathname } from 'next/navigation';

const chromeFreeRoutes = ['/checkout', '/checkout2', '/forgot-password', '/reset-password', '/login', '/register', '/verify-otp'];

const isChromeFreeRoute = (pathname: string) =>
  chromeFreeRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

const AppChrome = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  if (isChromeFreeRoute(pathname)) {
    return null;
  }

  return children;
};

export default AppChrome;