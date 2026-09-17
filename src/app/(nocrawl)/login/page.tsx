import type { Metadata } from "next";
import Footer from "@/components/Footer/Footer";
import LoginClient from "./LoginClient";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { getStoreName } from "@/libs/storeBranding";
import { isSafeCallbackUrl } from "@/libs/utils/authRedirect";
import { PRIVATE_PAGE_ROBOTS } from '@/config/indexing';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  return {
    title: 'Login',
    description: `Login to your ${storeName} account`,
    robots: PRIVATE_PAGE_ROBOTS,
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  // If user is already logged in and verified, honor the callback URL
  if (session) {
    if (!session.user.emailVerified) {
      redirect("/verify-otp");
    }
    redirect(isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/");
  }

  return (
    <>
      <div className="login-block md:py-20 py-10  border-y">
        <div className="container min-h-[70vh] flex justify-center items-center">
          <LoginClient />
        </div>
      </div>
    </>
  );
}