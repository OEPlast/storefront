import { ProductSale } from '@/types/product';
import React, { FC } from 'react';

const LimitedProductProgress: FC<{ sold: number; totalQuantity: number, salesType?: ProductSale['type']; }> = ({ sold, salesType, totalQuantity }) => {
    if (salesType === 'Limited')
        return (
            <div className="sold flex flex-wrap gap-3 mt-10">
                <div className="text-title">sold It:</div>
                <div className="right w-3/4">
                    <div className="progress h-2 rounded-full overflow-hidden mt-2 bg-line z-10">
                        <div
                            className={`percent-sold absolute top-0 left-0 h-full bg-red`}
                            style={{ width: `${Math.floor((sold / totalQuantity) * 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        <span>{Math.floor((sold / totalQuantity) * 100)}% Sold -</span>
                        <span className='text-secondary'>Only {Math.floor(totalQuantity - sold)} item(s) left in stock!</span>
                    </div>
                </div>
            </div>);
};

export default LimitedProductProgress;