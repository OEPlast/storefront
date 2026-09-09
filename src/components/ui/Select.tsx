'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/libs/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'children'> {
  label?: React.ReactNode;
  /** Controlled value. '' selects the placeholder option. */
  value: string;
  /** Receives the raw string value, not the change event. */
  onChange: (value: string) => void;
  /** Flat options, rendered before any groups. */
  options?: SelectOption[];
  /** Rendered as <optgroup> blocks, after `options`. */
  groups?: SelectOptionGroup[];
  /** When set, a leading <option value=""> with this label is rendered. */
  placeholder?: string;
  /** Non-empty string renders a red border + an <em> message below. */
  error?: string | null;
  /** Muted helper text below the control (suppressed while `error` is set). */
  hint?: React.ReactNode;
  /** Appends a red asterisk to the label. */
  required?: boolean;
  /** Class on the outer wrapper (NOT on the <select>). */
  containerClassName?: string;
  id?: string;
}

const renderOption = (option: SelectOption) => (
  <option key={option.value} value={option.value} disabled={option.disabled}>
    {option.label}
  </option>
);

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  groups,
  placeholder,
  error,
  hint,
  required,
  containerClassName,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) => {
  const generatedId = React.useId();
  const selectId = id ?? `select-${generatedId}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  const hasError = typeof error === 'string' && error.length > 0;
  const showHint = !hasError && hint !== undefined && hint !== null && hint !== false;

  const describedBy =
    [ariaDescribedBy, hasError ? errorId : null, showHint ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={containerClassName}>
      {/* The <label> sits OUTSIDE .select-block — globals.scss:53 selects `.select-block > .arrow-down`
          by direct-child, and the block is positioned relative to the control alone. */}
      {label !== undefined && label !== null && label !== false && (
        <label className="text-secondary text-sm mb-2 block" htmlFor={selectId}>
          {label}
          {required && <span className="text-red ml-0.5">*</span>}
        </label>
      )}

      <div className="select-block">
        <select
          {...rest}
          id={selectId}
          className={cn(
            'border border-line px-4 py-3 w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
            hasError && 'border-red-600',
            className
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options?.map(renderOption)}
          {groups?.map((group) =>
            group.options.length > 0 ? (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(renderOption)}
              </optgroup>
            ) : null
          )}
        </select>
        <Icon.CaretDown className='arrow-down' />
      </div>

      {hasError && (
        <em id={errorId} className="mt-1 block text-sm text-red">
          {error}
        </em>
      )}
      {showHint && (
        <span id={hintId} className="mt-1 block text-sm text-secondary">
          {hint}
        </span>
      )}
    </div>
  );
};

export default Select;
