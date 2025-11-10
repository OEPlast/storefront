'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { getCdnUrl } from '@/libs/cdn-url';
import { ProductDescriptionImage } from '@/types/product';

// Helper: select best image (cover → first)
const selectWishlistImage = (images?: ProductDescriptionImage[]): string => {
    if (!images || images.length === 0) return '';
    const cover = images.find((img) => img.cover_image)?.url;
    if (cover) return cover;
    return images[0]?.url ?? '';
};

const ModalWishlist = () => {
    const { data: session } = useSession();
    const { isModalOpen, closeModalWishlist } = useModalWishlistContext();

    // Read from Zustand store (client-side state)
    const wishlistItems = useWishlistStore(state => state.items);
    const removeFromWishlistStore = useWishlistStore(state => state.removeItem);

    // Mutation for server sync (only used when removing)
    const { mutate: removeFromWishlistMutation } = useRemoveFromWishlist();

    const handleRemove = (wishlistItemId: string, productId: string) => {
        // 1. Optimistically remove from Zustand (instant UI update)
        removeFromWishlistStore(productId);

        // 2. Sync with server
        removeFromWishlistMutation(wishlistItemId, {
            onError: () => {
                // Rollback handled by mutation if needed
                console.error('Failed to remove from wishlist');
            }
        });
    };

    console.log(wishlistItems);

    return (
        <>
            <div className={`modal-wishlist-block`} onClick={closeModalWishlist}>
                <div
                    className={`modal-wishlist-main py-6 ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); }}
                >
                    <div className="heading px-6 pb-3 flex items-center justify-between relative">
                        <div className="heading5">Wishlist</div>
                        <div
                            className="close-btn absolute right-6 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                            onClick={closeModalWishlist}
                        >
                            <Icon.X size={14} />
                        </div>
                    </div>
                    {!session?.user ? (
                        <div className="px-6 py-12 text-center">
                            {/* TODO: Add empty state image here */}
                            <div className="w-24 h-24 mx-auto mb-4 bg-surface rounded-full flex items-center justify-center">
                                <Icon.Heart size={48} className="text-secondary2" weight="light" />
                            </div>
                            <p className="heading6 mb-2">Login to save your favorite items</p>
                            <p className="text-secondary text-sm mb-6">Access your wishlist from any device</p>
                            <Link
                                href="/login?redirect=/wishlist"
                                onClick={closeModalWishlist}
                                className="button-main inline-block px-6 py-2.5 rounded-full text-sm"
                            >
                                Login Now
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="list-product px-6">
                                {wishlistItems.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="w-24 h-24 mx-auto mb-4 bg-surface rounded-full flex items-center justify-center">
                                            <Icon.Heart size={48} className="text-secondary2" weight="light" />
                                        </div>
                                        <p className="heading6 mb-2">Your wishlist is empty</p>
                                        <p className="text-secondary text-sm">Start adding products you love!</p>
                                    </div>
                                ) : (
                                    wishlistItems.slice(0, 30).map((wishlistItem) => {
                                        const imageUrl = selectWishlistImage(wishlistItem.product.description_images ?? wishlistItem.product.images);
                                        return (
                                            <div key={wishlistItem.productId} className='item py-5 flex items-center justify-between gap-3 border-b border-line'>
                                                <div className="infor flex items-center gap-5">
                                                    <div className="bg-img">
                                                        <Image
                                                            src={imageUrl ? getCdnUrl(imageUrl) : '/images/placeholder.png'}
                                                            width={300}
                                                            height={300}
                                                            alt={wishlistItem.product.name}
                                                            className='w-[100px] aspect-square flex-shrink-0 rounded-lg object-cover'
                                                        />
                                                    </div>
                                                    <div className=''>
                                                        <div className="name text-button">{wishlistItem.product.name}</div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="product-price text-title">${wishlistItem.product.price.toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="remove-wishlist-btn caption1 font-semibold text-red underline cursor-pointer"
                                                    onClick={() => wishlistItem._id && handleRemove(wishlistItem._id, wishlistItem.productId)}
                                                >
                                                    Remove
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="footer-modal p-6 border-t bg-white border-line absolute bottom-0 left-0 w-full text-center">
                                <Link href={'/wishlist'} onClick={closeModalWishlist} className='button-main w-full text-center uppercase'>View All Wish List</Link>
                                <div onClick={closeModalWishlist} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Or continue shopping</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ModalWishlist;