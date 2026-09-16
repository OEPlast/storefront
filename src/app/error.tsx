'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="page-error py-20">
            <div className="container">
                <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                    <Icon.WarningCircle size={64} className="text-secondary mb-6" />

                    <h1 className="heading3 mb-4">Something Went Wrong</h1>

                    <p className="text-secondary text-center mb-8">
                        We hit an unexpected problem loading this page. Please try again &mdash; if it keeps
                        happening, our support team can help.
                    </p>

                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <button type="button" onClick={() => reset()} className="button-main">
                            Try again
                        </button>
                        <Link
                            href="/"
                            className="button-main bg-white text-black border border-black hover:bg-gray-50"
                        >
                            Go to Homepage
                        </Link>
                    </div>

                    <p className="text-secondary text-sm mt-12 flex items-center gap-2 justify-center">
                        <Icon.Envelope size={18} />
                        Need help?{' '}
                        <Link href="/pages/contact" className="text-black hover:underline">
                            Contact our support team
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
