'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/libs/utils';

export type CollapsibleSectionVariant = 'card' | 'plain';

export interface CollapsibleSectionProps {
    /** Section heading. Rendered inside the toggle button. */
    title: React.ReactNode;
    /** Sub-line under the title. Rendered in BOTH the expanded and collapsed states. */
    description?: React.ReactNode;
    /** One-line recap rendered ONLY while collapsed (e.g. "3 items • 2 products"). */
    summary?: React.ReactNode;
    /** Leading icon node, e.g. <Icon.Package size={24} weight="duotone" />. */
    icon?: React.ReactNode;
    /** Sibling of the toggle button (e.g. a "Change" link). Never rendered inside the button. */
    headerRight?: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    /** Collapsible region. Mounted only while isExpanded. */
    children?: React.ReactNode;
    /** ALWAYS-VISIBLE region rendered after the collapsible region. */
    footer?: React.ReactNode;
    /** 'card' (default) = bordered card w/ bg-surface header. 'plain' = no chrome. */
    variant?: CollapsibleSectionVariant;
    /** Greys out and disables the toggle button. */
    disabled?: boolean;
    /** Renders a static header with no caret and no toggle affordance. */
    hideToggle?: boolean;
    /** Used as the DOM id root; the content region gets `${id}-content`. */
    id?: string;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    description,
    summary,
    icon,
    headerRight,
    isExpanded,
    onToggle,
    children,
    footer,
    variant = 'card',
    disabled = false,
    hideToggle = false,
    id,
    className,
    headerClassName,
    contentClassName,
    footerClassName,
}) => {
    const generatedId = React.useId();
    const rootId = id ?? `collapsible-${generatedId}`;
    const contentId = `${rootId}-content`;

    const isCard = variant === 'card';
    const isInteractive = !hideToggle && !disabled;

    // Identical inner layout whether the outer node is the toggle <button> or, under
    // hideToggle, a static <div> — so it is built once.
    const headerBody = (
        <>
            {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
            <span className="min-w-0 flex-1 block">
                <span className={cn('block', isCard ? 'heading6' : 'heading5')}>{title}</span>
                {description && (
                    <span className="text-secondary caption1 mt-1 block">{description}</span>
                )}
                {!isExpanded && summary && (
                    <span className="text-secondary caption1 mt-1 block">{summary}</span>
                )}
            </span>
        </>
    );

    const headerBodyClassName = 'flex flex-1 items-center gap-3 min-w-0 text-left';

    return (
        <section
            id={rootId}
            className={cn(
                isCard && 'border border-line rounded-lg mb-5 overflow-hidden',
                className
            )}
        >
            {/* headerRight is a SIBLING of the toggle, never a child: nesting an interactive
                node inside a <button> is invalid HTML and swallows its clicks. The hover tint
                therefore lives on this wrapper so the whole header still lights up. */}
            <div
                className={cn(
                    'flex items-center gap-3',
                    isCard ? 'p-5 bg-surface' : 'pb-3 md:pb-4',
                    isCard && isInteractive && 'hover:bg-line transition-all',
                    headerClassName
                )}
            >
                {hideToggle ? (
                    <div className={headerBodyClassName}>{headerBody}</div>
                ) : (
                    <button
                        type="button"
                        onClick={onToggle}
                        disabled={disabled}
                        aria-expanded={isExpanded}
                        aria-controls={contentId}
                        className={cn(
                            headerBodyClassName,
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        )}
                    >
                        {headerBody}
                        <span className="flex-shrink-0 ml-auto flex items-center">
                            {isExpanded ? (
                                <Icon.CaretUp size={20} weight="bold" />
                            ) : (
                                <Icon.CaretDown size={20} weight="bold" />
                            )}
                        </span>
                    </button>
                )}
                {headerRight}
            </div>

            {/* The region always exists so aria-controls always resolves; only its contents
                mount/unmount with isExpanded. */}
            <div id={contentId} hidden={!isExpanded}>
                {isExpanded && (
                    <div className={cn(isCard && 'p-5', contentClassName)}>{children}</div>
                )}
            </div>

            {/* Always visible — this is the whole reason the primitive exists: the order
                summary collapses its item list but keeps totals and trust badges on screen. */}
            {footer != null && (
                <div
                    className={cn(
                        isCard && (isExpanded ? 'px-5 pb-5' : 'p-5'),
                        footerClassName
                    )}
                >
                    {footer}
                </div>
            )}
        </section>
    );
};

export default CollapsibleSection;
