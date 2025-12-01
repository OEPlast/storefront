import React from 'react';
import Image from 'next/image';

interface LogoProps {
    alwaysFull?: boolean;
}

const Logo: React.FC<LogoProps> = ({ alwaysFull = false }) => {
    if (alwaysFull) {
        return (
            <Image
                src={'/images/brand/logoTransparent.png'}
                alt="Rawura Logo"
                width={120}
                height={60}
                priority
                className="w-full h-auto"
            />
        );
    }

    return (
        <>
            {/* Full logo for larger screens */}
            <div className="hidden sm:block">
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
            <div className="block sm:hidden">
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