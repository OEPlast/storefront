"use client";

import React from "react";

interface Props {
  props: string;
  slogan: string;
}

const TopNavOne: React.FC<Props> = ({ props, slogan }) => {
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
