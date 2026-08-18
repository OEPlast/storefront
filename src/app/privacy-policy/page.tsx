import React from 'react';
import PrivacyPolicyClient from './PrivacyPolicyClient';
import { Metadata } from 'next';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreName } from '@/libs/storeBranding';

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata({
    title: 'Privacy Policy',
    description: 'Read our privacy policy to understand how we collect, use, and protect your personal information.',
    keywords: ['privacy policy', 'data protection', 'user privacy', 'terms'],
    openGraph: {
      title: 'Privacy Policy',
      description: 'Our commitment to protecting your personal information and privacy.',
    },
  });
}

export default async function PrivacyPolicyPage() {
  const storeName = await getStoreName();
  return <PrivacyPolicyClient storeName={storeName} />;
}
