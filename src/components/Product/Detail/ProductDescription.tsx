'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// react-quill-new references `document` at module scope, which crashes SSR
// ("document is not defined"). That SSR error also forces React to defer sibling
// server content (incl. our Product JSON-LD) into the client flight payload — so
// loading Quill client-only keeps the product page SSR clean AND crawlable.
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const ProductDescription = ({ description }: { description?: string }) => {
    return (
        <div className='w-full '>
            <div className="w-full">
                <div className="text-secondary mt-2 flex justify-center">
                    {description ? (
                        <ReactQuill
                            theme="bubble"
                            className='max-w-[900px]'
                            readOnly={true}
                            value={description}
                        />
                    ) : (
                        'N/A'
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDescription;
