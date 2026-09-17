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

// The logo always sits inside a link home, so its alt text is the link's name: just the store name.
// "<store> Logo" read as page text, and Google quoted it ("Rawura Logo.") in search snippets.
const Logo = ({ alwaysFull = false, storeName }: LogoProps) => {
  if (alwaysFull) {
    return (
      <div className="max-w-[120px]">
        <Image
          src={'/images/brand/logoTransparent.png'}
          alt={storeName}
          width={120}
          height={60}
          priority
          referrerPolicy="no-referrer"
          className="h-auto w-full"
        />
      </div>
    );
  }

  return (
    <>
      {/* Full logo for larger screens */}
      <div className="hidden max-w-[120px] sm:block">
        <Image
          src={'/images/brand/logoTransparent.png'}
          alt={storeName}
          width={120}
          height={60}
          priority
          className="h-auto w-full"
        />
      </div>

      {/* Mini logo for mobile screens */}
      <div className="my-1 block max-w-[40px] xs:max-w-[50px] sm:hidden">
        <Image
          src={'/images/brand/logoMiniLight.png'}
          alt={storeName}
          width={50}
          height={50}
          priority
          className="h-auto w-full"
        />
      </div>
    </>
  );
};

export default Logo;
