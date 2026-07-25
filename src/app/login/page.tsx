import type { Metadata } from "next";
import Footer from "@/components/Footer/Footer";
import LoginClient from "./LoginClient";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login - Rawura",
  description: "Login to your Rawura account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  // If user is already logged in and verified, honor the callback URL
  if (session) {
    const isSafeCallbackUrl = !!callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
    if (!session.user.emailVerified) {
      redirect("/verify-otp");
    }
    redirect(isSafeCallbackUrl ? callbackUrl : "/");
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