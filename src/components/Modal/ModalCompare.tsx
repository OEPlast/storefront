'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useModalCompareContext } from '@/context/ModalCompareContext';
import { CompareItem, useCompare } from '@/context/CompareContext';
import { ProductType } from '@/types/ProductType';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';

// Helper: pick best image for compare – prefer description_images cover, then first description image,
// then cover from images, then first image. Returns raw URL (to be wrapped with getCdnUrl).
const selectCompareImage = (product: CompareItem): string => {
  const descCover = product.description_images?.find((img) => img.cover_image)?.url;
  if (descCover) return descCover;
  const firstDesc = product.description_images?.[0]?.url;
  if (firstDesc) return firstDesc;
  return '';
};

const ModalCompare = () => {
  const { isModalOpen, closeModalCompare } = useModalCompareContext();
  const { compareState, removeFromCompare, clearCompare } = useCompare();

  return (
    <>
      <div className={`modal-compare-block`}>
        <div
          className={`modal-compare-main py-6 ${isModalOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="close-btn absolute right-4 top-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-surface duration-300 hover:bg-black hover:text-white md:-top-4 lg:h-10 lg:w-10 2xl:right-6 2xl:top-6"
            onClick={closeModalCompare}
          >
            <Icon.X className="body1" />
          </div>
          <div className="container flex h-full w-full items-center">
            <div className="content-main flex w-full items-center justify-between gap-6 max-md:flex-wrap xl:gap-10">
              <div className="heading5 flex-shrink-0 max-md:w-full">Compare</div>
              <div className="list-product flex w-full items-center gap-4">
                {compareState.compareArray.slice(0, 3).map((product, i) => (
                  <div
                    key={product._id}
                    className="item relative rounded-xl border border-line p-3"
                  >
                    <div className="infor flex items-center gap-4">
                      <div className="bg-img h-[100px] w-[100px] flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={getCdnUrl(selectCompareImage(product))}
                          width={500}
                          height={500}
                          alt={product.name}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="">
                        <div className="name text-title">{product.name}</div>
                        <div className="product-price text-title mt-2">
                          {formatToNaira(product.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="block-button flex flex-shrink-0 flex-col gap-4">
                {compareState.compareArray.length < 2 ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="button-main cursor-not-allowed whitespace-nowrap opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Compare Products
                    </button>
                    <div className="text-sm text-red-600">
                      Minimum 2 products required to compare
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/compare?identifiers=${compareState.compareArray.map((p) => p._id).join(',')}`}
                      onClick={closeModalCompare}
                      className="button-main whitespace-nowrap"
                    >
                      Compare Products
                    </Link>
                  </>
                )}
                <div
                  onClick={() => {
                    clearCompare();
                    closeModalCompare();
                  }}
                  className="button-main cursor-pointer whitespace-nowrap border border-black bg-white text-black"
                >
                  Clear All Products
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalCompare;
