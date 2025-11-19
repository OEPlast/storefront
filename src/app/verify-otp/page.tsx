import type { Metadata } from "next";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
// import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import VerifyOTPForm from "@/components/forms/VerifyOTPForm";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verify OTP - OEPlast",
  description: "Verify your email address with OTP",
};

export default async function VerifyOTPPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  if (session.user.emailVerified) {
    redirect('/');
  }
  return (
    <>
      <div className="verify-otp-block md:py-20 py-10 my-10">
        <div className="container min-[80vh]">
          <div className="content-main flex items-center justify-center">
            <div className="w-full max-w-[650px] bg-surface p-8 rounded-2xl">
              <VerifyOTPForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
