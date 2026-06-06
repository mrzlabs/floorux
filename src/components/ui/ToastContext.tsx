'use client';

import { createContext, useContext, type ReactNode } from 'react';

type ToastFn = (msg: string, icon?: string) => void;

const ToastContext = createContext<ToastFn | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  toast: ToastFn;
}

export function ToastProvider({ children, toast }: ToastProviderProps) {
  return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast requiere ToastProvider');
  return toast;
}
