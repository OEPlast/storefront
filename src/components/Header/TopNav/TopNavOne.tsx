"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface Props {
  props: string;
  slogan: string;
}

const TopNavOne: React.FC<Props> = ({ props, slogan }) => {
  const [isOpenLanguage, setIsOpenLanguage] = useState(false);
  const [isOpenCurrence, setIsOpenCurrence] = useState(false);
  const [language, setLanguage] = useState("English");
  const [currence, setCurrence] = useState("USD");

  return (
    <>
      <div className={`top-nav md:h-[44px] h-[30px] ${props}`}>
        <div className="container mx-auto h-full">
          <div className="top-nav-main flex justify-center h-full">

            <div className="text-center text-button-uppercase text-white flex items-center">{slogan}</div>

          </div>
        </div>
      </div>
    </>
  );
};

export default TopNavOne;
