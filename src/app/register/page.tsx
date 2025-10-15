"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import TopNavOne from "@/components/Header/TopNav/TopNavOne";
import MenuOne from "@/components/Header/Menu/MenuOne";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { GoogleLogo } from "@phosphor-icons/react";
import { GetCountries } from "react-country-state-city";
import { Country } from "react-country-state-city/dist/esm/types";
import { FcGoogle } from "react-icons/fc";
import { signIn, signOut } from "next-auth/react";
import GoogleLogin from "@/components/Other/GoogleLogin";
import RegisterClient from "./RegisterClient";

const Register = () => {
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  useEffect(() => {
    GetCountries().then((result) => {
      setCountriesList(result);
    });
  }, []);
  return (
    <>
      <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
      <div id="header" className="relative w-full">
        <MenuOne props="bg-transparent" />
      </div>
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
