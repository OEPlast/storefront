import type { Metadata } from 'next';
import CompareClient from './CompareClient';

// Robots come from the (nocrawl) group layout. Only the title belongs here.
export const metadata: Metadata = { title: 'Compare Products' };

export default function ComparePage() {
  return <CompareClient />;
}
