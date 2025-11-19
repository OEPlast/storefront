import React from 'react';
import Link from 'next/link';
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface Pros {
    heading: string;
    subHeading?: string;
}

const Breadcrumb: React.FC<Pros> = ({ heading, subHeading }) => {
    return (
        <>
            <div className="breadcrumb-block style-shared">
                <div className="breadcrumb-main bg-green overflow-hidden">
                    <div
                        className={`container relative ${subHeading
                            ? ' lg:pt-[134px] pt-24 pb-10'
                            : 'py-16 sm:py-24'
                            }`}
                    >
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">{heading}</div>
                                {subHeading && (<div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href={'/'}>Homepage</Link>
                                    <Icon.CaretRight size={14} className='text-secondary2' />
                                    <div className='text-secondary2 capitalize'>{subHeading}</div>
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Breadcrumb;