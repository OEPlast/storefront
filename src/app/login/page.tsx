import type { Metadata } from "next";
import Footer from "@/components/Footer/Footer";
import LoginClient from "./LoginClient";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login - Rawura",
  description: "Login to your Rawura account",
};

export default async function LoginPage() {
  const session = await auth();

  // If user is already logged in, redirect to homepage
  if (session) {
    redirect("/");
  }

  return (
    <>
      <div className="login-block md:py-20 py-10  border-y">
        <div className="container">
          <LoginClient />
        </div>
      </div>
      <Footer />
    </>
  );
}