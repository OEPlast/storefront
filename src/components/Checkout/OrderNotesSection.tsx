'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';

interface OrderNotesSectionProps {
    isExpanded: boolean;
    onToggle: () => void;
}

const OrderNotesSection: React.FC<OrderNotesSectionProps> = ({
    isExpanded,
    onToggle,
}) => {
    return (
        <div className="notes-section border border-line rounded-lg mb-5 overflow-hidden">
            <div
                className="flex items-center justify-between p-5 cursor-pointer bg-surface hover:bg-surface-variant1 transition-all"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <Icon.Note size={24} weight="duotone" className="text-green" />
                    <div>
                        <div className="heading6">Order Notes</div>
                        <div className="text-secondary caption1 mt-1">Add special instructions</div>
                    </div>
                </div>
                {isExpanded ? (
                    <Icon.CaretUp size={20} weight="bold" />
                ) : (
                    <Icon.CaretDown size={20} weight="bold" />
                )}
            </div>

            {isExpanded && (
                <div className="p-5 pt-0">
                    <textarea
                        className="border border-line px-4 py-3 w-full rounded-lg min-h-[120px]"
                        id="note"
                        name="note"
                        placeholder="Add any special instructions for your order...">
                    </textarea>
                </div>
            )}
        </div>
    );
};

export default OrderNotesSection;
