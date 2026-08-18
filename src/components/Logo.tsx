import Image from 'next/image';

interface LogoProps {
    alwaysFull?: boolean;
    /**
     * Passed by the caller rather than fetched here — this component is imported from both
     * Server Components (Footer) and Client Components (MenuEight), and an async Server
     * Component can't be rendered directly inside a 'use client' module.
     */
    storeName: string;
}

const Logo = ({ alwaysFull = false, storeName }: LogoProps) => {
    if (alwaysFull) {
        return (
            <div className="max-w-[120px]">
                <Image
                    src={'/images/brand/logoTransparent.png'}
                    alt={`${storeName} Logo`}
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
                    alt={`${storeName} Logo`}
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
                    alt={storeName}
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