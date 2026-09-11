import Footer from '@/components/Footer/Footer';
import RegisterClient from './RegisterClient';
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { isSafeCallbackUrl } from '@/libs/utils/authRedirect';

const Register = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) => {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    if (!session.user.emailVerified) {
      redirect("/verify-otp");
    }
    redirect(isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/");
  }

  return (
    <>
      <div className="register-block border-y py-10 md:py-20">
        <div className="container !max-w-[650px]">
          <RegisterClient />
        </div>
      </div>
      {/* <Footer /> */}
    </>
  );
};

export default Register;
