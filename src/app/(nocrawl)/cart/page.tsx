import type { Metadata } from 'next';
import CartClient from './CartClient';

// Robots come from the (nocrawl) group layout. Only the title belongs here — without it this
// page inherited the homepage's title, and that's how "Your cart is empty" became a Google
// sitelink.
export const metadata: Metadata = { title: 'Cart' };

export default function CartPage() {
  return <CartClient />;
}
