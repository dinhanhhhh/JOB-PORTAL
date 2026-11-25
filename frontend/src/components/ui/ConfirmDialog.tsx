"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomButton from "@/components/ui/CustomButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { language } = useLanguage();
  const tc = translations[language].common;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {variant === "destructive" && (
              <div className="rounded-full bg-destructive/10 p-2 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-lg font-semibold leading-snug break-words"
              >
                {title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            aria-label={tc.close}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel ?? tc.cancel}
          </Button>
          {variant === "destructive" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={onConfirm}
              className={cn(loading && "opacity-70")}
            >
              {loading ? tc.loading : confirmLabel ?? tc.confirm}
            </Button>
          ) : (
            <CustomButton
              type="button"
              loading={loading}
              disabled={loading}
              onClick={onConfirm}
            >
              {confirmLabel ?? tc.confirm}
            </CustomButton>
          )}
        </div>
      </div>
    </div>
  );
}
