import { EyeIcon, ShoppingBagOpenIcon } from '@phosphor-icons/react';
import React from 'react';

export const ProductSkeleton = () => {
    return (
        <div className={`product-item grid-type`}>
            {/* <Link href={`/product/${data.slug}`} className="product-main cursor-pointer block"> */}
            <div className="product-main cursor-pointer block">
                <div className="product-thumb bg-white relative overflow-hidden rounded-2xl">


                    <div className="product-img w-full h-full aspect-[3/4] block bg-gray-100 animate-pulse">

                    </div>


                </div>

                <div className='w-full relative mt-2'>
                    <div className="product-name w-full h-[10px] bg-gray-200 animate-pulse mb-2 rounded-full" />
                    <div className="product-name w-1/2 h-[10px] bg-gray-200 animate-pulse rounded-full" />

                </div>

            </div>
        </div>
    );
};

export const ProductLoading = ({ amount = 10 }: { amount?: number; }) => {
    return (
        <div className="list-product show-product-sold grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
            {Array(amount).fill(0).map((_, index) => (
                <ProductSkeleton key={`productSkeleton__${index}`} />
            ))}
        </div>);
};

export default ProductLoading;

/*
Example
<div className="tab-features-block">
                <div className='container'>
                    <ProductLoading amount={20} />
                </div>
            </div> */