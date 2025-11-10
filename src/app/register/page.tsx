import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { GoogleLogo } from "@phosphor-icons/react";
import { FcGoogle } from "react-icons/fc";
import GoogleLogin from "@/components/Other/GoogleLogin";
import RegisterClient from "./RegisterClient";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

const Register = async () => {

  const session = await auth();
  if (session?.user) {
    redirect('/');
  }

  return (
    <>
      <div className="register-block md:py-20 py-10 border-y">
        <div className="container !max-w-[650px]">
          <RegisterClient />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Register;
