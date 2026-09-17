import { redirect } from 'next/navigation';
import { auth } from '@@/auth';
import MyAccountClient from './MyAccountClient';

export default async function MyAccountPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  return <MyAccountClient />;
}
