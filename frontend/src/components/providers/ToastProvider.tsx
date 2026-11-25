"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; iconClass: string }
> = {
  success: {
    container:
      "border-emerald-500/40 bg-card/95 text-foreground shadow-emerald-500/10",
    iconClass: "text-emerald-500",
  },
  error: {
    container:
      "border-destructive/40 bg-card/95 text-foreground shadow-destructive/10",
    iconClass: "text-destructive",
  },
  warning: {
    container:
      "border-amber-500/40 bg-card/95 text-foreground shadow-amber-500/10",
    iconClass: "text-amber-500",
  },
  info: {
    container:
      "border-primary/30 bg-card/95 text-foreground shadow-primary/10",
    iconClass: "text-primary",
  },
};

function ToastIcon({ variant, className }: { variant: ToastVariant; className: string }) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className={cn("h-4 w-4 shrink-0", className)} />;
    case "error":
      return <AlertCircle className={cn("h-4 w-4 shrink-0", className)} />;
    case "warning":
      return <AlertTriangle className={cn("h-4 w-4 shrink-0", className)} />;
    case "info":
    default:
      return <Info className={cn("h-4 w-4 shrink-0", className)} />;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev.slice(-4), { id, variant, message }]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, TOAST_DURATION_MS);

      timersRef.current.set(id, timer);
    },
    []
  );

  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (message: string) => pushToast("success", message),
        error: (message: string) => pushToast("error", message),
        info: (message: string) => pushToast("info", message),
        warning: (message: string) => pushToast("warning", message),
      },
      dismiss,
    }),
    [pushToast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200",
                style.container
              )}
            >
              <ToastIcon variant={item.variant} className={cn("mt-0.5", style.iconClass)} />
              <p className="flex-1 text-sm leading-snug break-words">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
