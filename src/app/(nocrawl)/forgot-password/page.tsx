import type { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

// Robots come from the (nocrawl) group layout. Only the title belongs here.
export const metadata: Metadata = { title: 'Reset Password' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
