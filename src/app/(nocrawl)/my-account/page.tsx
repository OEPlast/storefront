import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@@/auth';
import MyAccountClient from './MyAccountClient';

// Robots come from the (nocrawl) group layout; only the title belongs here. It used to come from
// this route's own layout.tsx, deleted when every private page moved into that shared group.
export const metadata: Metadata = { title: 'My Account' };

export default async function MyAccountPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  return <MyAccountClient />;
}
