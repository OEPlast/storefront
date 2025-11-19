'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AutocompleteProduct } from '@/types/product';
import { getCdnUrl } from '@/libs/cdn-url';
import { cn } from '@/libs/utils';

export interface AutocompleteDropdownProps {
    open: boolean;
    loading: boolean;
    suggestions: AutocompleteProduct[];
    history: string[];
    activeIndex: number;
    // Anchoring: wrapper of the input to align dropdown width
    anchorRef: React.RefObject<HTMLDivElement | null>;
    onSelectSuggestion: (item: AutocompleteProduct) => void;
    onSelectHistory: (term: string) => void;
    onClearHistory: () => void;
    classname?: string;
}

const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
    open,
    loading,
    suggestions,
    history,
    activeIndex,
    anchorRef,
    onSelectSuggestion,
    onSelectHistory,
    onClearHistory,
    classname
}) => {
    // Compute dropdown width to match anchor
    const width = useMemo(() => {
        if (!anchorRef.current) return '100%';
        return `${anchorRef.current.getBoundingClientRect().width}px`;
    }, [anchorRef]);


    if (!open) return null;

    return (
        <div
            className={cn('absolute z-50 mt-1 bg-white border border-line rounded-b-lg shadow-md overflow-hidden w-full top-10', classname)}
            style={{
                //  width,

                left: 0, right: 'auto'
            }}
            role="listbox"
            aria-activedescendant={activeIndex >= 0 ? `autocomplete-option-${activeIndex}` : undefined}
        >
            {/* Loading state */}
            {loading && (
                <>
                    <div className="mx-4 my-3 text-sm bg-gray-200 h-7 w-[95%] animate-pulse rounded-lg" />
                    <div className="mx-4 my-3 text-sm bg-gray-200 h-7 w-[94%] animate-pulse rounded-lg" />
                </>
            )}

            {/* Suggestions */}
            {!loading && suggestions.length > 0 && (
                <ul>
                    {suggestions.map((s, idx) => (
                        <li
                            id={`autocomplete-option-${idx}`}
                            key={`${s.slug ?? s._id}-${idx}`}
                            className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 ${activeIndex === idx ? 'bg-gray-50' : ''
                                }`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelectSuggestion(s);
                            }}
                        >
                            {s.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getCdnUrl(s.image)} alt={s.name} className="w-8 h-8 rounded object-cover" />
                            )}
                            <div className="flex-1">
                                <div className="text-sm text-gray-900">{s.name}</div>
                                {s.category?.name && (
                                    <div className="text-xs text-gray-500">
                                        {s.category.name}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Recent history */}
            {!loading && suggestions.length === 0 && history.length > 0 && (
                <div>
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Recent searches</div>
                        <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onClearHistory();
                            }}
                        >
                            Clear
                        </button>
                    </div>
                    <ul>
                        {history.map((term, idx) => (
                            <li
                                id={`autocomplete-history-${idx}`}
                                key={`${term}-${idx}`}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-800"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelectHistory(term);
                                }}
                            >
                                {term}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!loading && suggestions.length === 0 && history.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400">No suggestions</div>
            )}
        </div>
    );
};

export default AutocompleteDropdown;
