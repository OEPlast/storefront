import React from 'react';
import Image from 'next/image';

interface LogoProps {
    alwaysFull?: boolean;
}

const Logo: React.FC<LogoProps> = ({ alwaysFull = false }) => {
    if (alwaysFull) {
        return (
            <div className="max-w-[120px]">
                <Image
                    src={'/images/brand/logoTransparent.png'}
                    alt="Rawura Logo"
                    width={120}
                    height={60}
                    priority
                    className="w-full h-auto"
                />
            </div>
        );
    }

    return (
        <>
            {/* Full logo for larger screens */}
            <div className="hidden sm:block max-w-[120px]">
                <Image
                    src={'/images/brand/logoTransparent.png'}
                    alt="Rawura Logo"
                    width={120}
                    height={60}
                    priority
                    className="w-full h-auto"
                />
            </div>

            {/* Mini logo for mobile screens */}
            <div className="block sm:hidden max-w-[40px] xs:max-w-[50px] my-1">
                <Image
                    src={'/images/brand/logoMiniLight.png'}
                    alt="Rawura"
                    width={50}
                    height={50}
                    priority
                    className="w-full h-auto"
                />
            </div>
        </>
    );
};

export default Logo;