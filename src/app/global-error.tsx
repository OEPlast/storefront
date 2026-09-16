'use client';

import { useEffect } from 'react';

// Rendered when the root layout itself fails, so it cannot rely on the app's
// layout, providers, fonts or stylesheets — it must ship its own <html>/<body>.
export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    background: '#ffffff',
                    color: '#1f1f1f',
                    padding: '24px',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ maxWidth: 480, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Something went wrong</h1>
                    <p style={{ fontSize: 16, lineHeight: 1.5, color: '#696c70', margin: '0 0 24px' }}>
                        We couldn&apos;t load the store right now. Please reload the page to try again.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#1f1f1f',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '12px 28px',
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Reload page
                    </button>
                </div>
            </body>
        </html>
    );
}
