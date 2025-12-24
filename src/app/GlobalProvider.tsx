import React from 'react';
import { CartProvider } from '@/context/CartContext';
import { ModalCartProvider } from '@/context/ModalCartContext';
import { ModalWishlistProvider } from '@/context/ModalWishlistContext';
import { CompareProvider } from '@/context/CompareContext';
import { ModalCompareProvider } from '@/context/ModalCompareContext';
import { ModalSearchProvider } from '@/context/ModalSearchContext';
import { ModalQuickviewProvider } from '@/context/ModalQuickviewContext';
import ReactQueryProvider from '@/provider/react-query';
import { SessionProvider } from 'next-auth/react';
import ServerQueries from '@/provider/Server-queries';

const GlobalProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
    return (
        <SessionProvider>
            <ReactQueryProvider>
                <ServerQueries>
                    <CartProvider>
                        <ModalCartProvider>
                            <ModalWishlistProvider>
                                <CompareProvider>
                                    <ModalCompareProvider>
                                        <ModalSearchProvider>
                                            <ModalQuickviewProvider>
                                                {children}
                                            </ModalQuickviewProvider>
                                        </ModalSearchProvider>
                                    </ModalCompareProvider>
                                </CompareProvider>
                            </ModalWishlistProvider>
                        </ModalCartProvider>
                    </CartProvider>
                </ServerQueries>
            </ReactQueryProvider>
        </SessionProvider>
    );
};
export default GlobalProvider;