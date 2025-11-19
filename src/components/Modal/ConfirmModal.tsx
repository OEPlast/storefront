'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Icon.Warning className="text-5xl text-red" />,
      confirmButton: 'bg-red hover:bg-red/90 text-white',
    },
    warning: {
      icon: <Icon.WarningCircle className="text-5xl text-yellow" />,
      confirmButton: 'bg-yellow hover:bg-yellow/90 text-white',
    },
    info: {
      icon: <Icon.Info className="text-5xl text-blue" />,
      confirmButton: 'bg-black hover:bg-black/90 text-white',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {currentVariant.icon}
          </div>

          {/* Title */}
          <h5 className="heading5 text-center mb-2">{title}</h5>

          {/* Message */}
          <p className="text-secondary text-center mb-6">{message}</p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-line rounded-lg hover:bg-surface transition-all font-semibold"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 rounded-lg transition-all font-semibold ${currentVariant.confirmButton}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon.CircleNotch className="animate-spin" />
                  Loading...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
