import React from 'react';
import ReactQuill from 'react-quill-new';

const ProductDescription = ({ description }: { description?: string; }) => {
    return (
        <div className='w-full '>
            <div className="w-full">
                <div className="text-secondary mt-2 flex justify-center">

                    {description ? <ReactQuill theme="bubble" className='max-w-[900px]' readOnly={true} value={description} /> : 'N/A'}
                </div>
            </div>
        </div>
    );
};

export default ProductDescription;