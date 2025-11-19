'use client';

// CompareContext.tsx
import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import { ProductDetail } from '@/types/product';
import toast from 'react-hot-toast';

interface CompareItem extends ProductDetail {
}

interface CompareState {
    compareArray: CompareItem[];
}

type CompareAction =
    | { type: 'ADD_TO_WISHLIST'; payload: ProductDetail; }
    | { type: 'REMOVE_FROM_WISHLIST'; payload: string; }
    | { type: 'CLEAR_ALL'; }
    | { type: 'LOAD_WISHLIST'; payload: CompareItem[]; };

interface CompareContextProps {
    compareState: CompareState;
    addToCompare: (item: ProductDetail) => void;
    removeFromCompare: (itemId: string) => void;
    clearCompare: () => void;
}

const CompareContext = createContext<CompareContextProps | undefined>(undefined);

const CompareReducer = (state: CompareState, action: CompareAction): CompareState => {
    switch (action.type) {
        case 'ADD_TO_WISHLIST':
            const newItem: CompareItem = { ...action.payload };
            return {
                ...state,
                compareArray: [...state.compareArray, newItem],
            };
        case 'REMOVE_FROM_WISHLIST':
            return {
                ...state,
                compareArray: state.compareArray.filter((item) => item._id !== action.payload),
            };
        case 'CLEAR_ALL':
            return {
                ...state,
                compareArray: [],
            };
        case 'LOAD_WISHLIST':
            return {
                ...state,
                compareArray: action.payload,
            };
        default:
            return state;
    }
};

export const CompareProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
    const [compareState, dispatch] = useReducer(CompareReducer, { compareArray: [] });

    const addToCompare = (item: ProductDetail) => {
        // Enforce maximum 3 products for comparison
        if (compareState.compareArray.length >= 3) {
            toast.error('Maximum 3 products can be compared at once');
            return;
        }

        // Check if product already exists in comparison
        if (compareState.compareArray.find(p => p._id === item._id)) {
            toast.error('Product already in comparison');
            return;
        }

        dispatch({ type: 'ADD_TO_WISHLIST', payload: item });
        toast.success('Product added to comparison');
    };

    const removeFromCompare = (itemId: string) => {
        dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: itemId });
    };

    const clearCompare = () => {
        dispatch({ type: 'CLEAR_ALL' });
    };

    return (
        <CompareContext.Provider value={{ compareState, addToCompare, removeFromCompare, clearCompare }}>
            {children}
        </CompareContext.Provider>
    );
};

export const useCompare = () => {
    const context = useContext(CompareContext);
    if (!context) {
        throw new Error('useCompare must be used within a CompareProvider');
    }
    return context;
};
