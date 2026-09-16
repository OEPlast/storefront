import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
    title: 'Page Not Found',
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <div className="page-not-found md:py-20 py-10">
            <div className="container">
                <div className="flex items-center justify-between max-sm:flex-col gap-y-8">
                    <Image
                        src="/images/other/404-img.png"
                        width={2000}
                        height={2000}
                        alt=""
                        priority
                        className="sm:w-1/2 w-3/4"
                    />
                    <div className="sm:w-1/2 w-full flex flex-col max-sm:items-center max-sm:text-center sm:pl-10">
                        <h1 className="heading3 mb-4">Page Not Found</h1>
                        <p className="text-secondary mb-8">
                            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been
                            moved, renamed, or is no longer available.
                        </p>

                        <div className="flex items-center gap-4 flex-wrap max-sm:justify-center">
                            <Link href="/" className="button-main">
                                Go to Homepage
                            </Link>
                            <Link
                                href="/search-result"
                                className="button-main bg-white text-black border border-black hover:bg-gray-50"
                            >
                                Search Products
                            </Link>
                        </div>

                        <p className="text-secondary text-sm mt-8 flex items-center gap-2 max-sm:justify-center">
                            <Icon.Envelope size={18} />
                            Need help?{' '}
                            <Link href="/pages/contact" className="text-black hover:underline">
                                Contact our support team
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
