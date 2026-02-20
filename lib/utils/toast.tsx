'use client';

import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { CircleCheckIcon, TriangleAlertIcon, OctagonXIcon, InfoIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface CustomToastProps {
  id: string | number;
  type: ToastType;
  title?: string;
  description: string;
}

const toastConfig = {
  success: {
    icon: CircleCheckIcon,
    bgVar: '--success',
  },
  error: {
    icon: OctagonXIcon,
    bgVar: '--danger',
  },
  warning: {
    icon: TriangleAlertIcon,
    bgVar: '--warning',
  },
  info: {
    icon: InfoIcon,
    bgVar: '--brand',
  },
};

function CustomToast({ id, type, title, description }: CustomToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  // Get computed CSS variable values
  const bgColor = `rgb(var(${config.bgVar}))`;

  return (
    <div
      className="flex rounded-lg shadow-lg ring-1 ring-black/10 w-full md:max-w-[420px] items-start gap-3 p-4 text-white"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold mb-1">{title}</p>}
        <p className="text-sm opacity-95">{description}</p>
      </div>
      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface ToastOptions {
  title?: string;
  description: string;
  duration?: number;
}

export const toast = {
  success: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    return sonnerToast.custom(
      (id) => <CustomToast id={id} type="success" {...opts} />,
      { duration: opts.duration ?? 3000 }
    );
  },
  error: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    return sonnerToast.custom(
      (id) => <CustomToast id={id} type="error" {...opts} />,
      { duration: opts.duration ?? 4000 }
    );
  },
  warning: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    return sonnerToast.custom(
      (id) => <CustomToast id={id} type="warning" {...opts} />,
      { duration: opts.duration ?? 3500 }
    );
  },
  info: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { description: options } : options;
    return sonnerToast.custom(
      (id) => <CustomToast id={id} type="info" {...opts} />,
      { duration: opts.duration ?? 3000 }
    );
  },
};
