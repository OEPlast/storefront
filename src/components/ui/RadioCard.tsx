'use client';

import React from 'react';

export type RadioCardPosition = 'first' | 'middle' | 'last' | 'only';

export interface RadioCardProps {
    /** Shared radio group name. Must match across the group. */
    name: string;
    value: string;
    checked: boolean;
    /** Fires with this card's `value` on selection. Wired to onChange, never onClick. */
    onChange: (value: string) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Right-aligned slot: price, ETA, or a trailing icon. */
    right?: React.ReactNode;
    /** Panel rendered inside `.infor`; animates open. Rendered OUTSIDE the <label>. */
    children?: React.ReactNode;
    /** Defaults to `checked`. */
    expanded?: boolean;
    disabled?: boolean;
    /** Corner rounding within a stack. Default 'only'. */
    position?: RadioCardPosition;
    id?: string;
    className?: string;
}

export interface RadioCardGroupProps {
    /** aria-label for role="radiogroup". Required — the group has no visible <legend>. */
    label: string;
    children: React.ReactNode;
    className?: string;
}

const POSITION_CLASS: Record<RadioCardPosition, string> = {
    first: 'rounded-t-lg',
    middle: '',
    last: 'rounded-b-lg',
    only: 'rounded-lg',
};

const cx = (...classes: Array<string | false | null | undefined>): string =>
    classes.filter(Boolean).join(' ');

/**
 * Renders BOTH ancestor scopes the existing SCSS needs, so no new CSS is required:
 * `.checkout-block .deli_type` powers the selected-row gradient (cart.scss:106-115) and
 * `.payment-block .list-payment` powers the animated `.infor` panel (cart.scss:117-136).
 */
export const RadioCardGroup: React.FC<RadioCardGroupProps> = ({ label, children, className }) => (
    <div className={cx('checkout-block', 'payment-block', className)}>
        <div className="deli_type list-payment" role="radiogroup" aria-label={label}>
            {children}
        </div>
    </div>
);

const RadioCard: React.FC<RadioCardProps> = ({
    name,
    value,
    checked,
    onChange,
    title,
    description,
    right,
    children,
    expanded,
    disabled = false,
    position = 'only',
    id,
    className,
}) => {
    const generatedId = React.useId();
    const inputId = id ?? `radio-card-${generatedId}`;
    const panelId = `${inputId}-panel`;
    const isOpen = expanded ?? checked;

    return (
        // `item` + `type` must both sit here: `item` is what `:has(input:checked)` is scoped to,
        // `type` is what `.open` toggles the `.infor` transition on.
        <div
            className={cx(
                'item',
                'type',
                isOpen && 'open',
                'relative border border-line',
                POSITION_CLASS[position],
                disabled && 'opacity-50',
                className
            )}
        >
            <label
                htmlFor={inputId}
                className={cx(
                    'flex items-center gap-3 px-5 py-4',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
            >
                <input
                    type="radio"
                    id={inputId}
                    name={name}
                    value={value}
                    checked={checked}
                    disabled={disabled}
                    aria-controls={children ? panelId : undefined}
                    onChange={() => onChange(value)}
                    className={cx('flex-shrink-0', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
                />
                <span className="min-w-0 flex-1">
                    <span className="text-title block">{title}</span>
                    {description ? (
                        <span className="caption1 text-secondary mt-1 block">{description}</span>
                    ) : null}
                </span>
                {right ? <span className="ml-auto flex-shrink-0 text-right">{right}</span> : null}
            </label>
            {/* Always rendered (even when empty) so the max-height transition has a target,
                and always OUTSIDE the <label> so panel controls don't re-select the radio. */}
            <div className="infor" id={panelId}>
                {children}
            </div>
        </div>
    );
};

export default RadioCard;
