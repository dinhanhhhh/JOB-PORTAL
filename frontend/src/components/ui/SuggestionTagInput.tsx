"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ChevronDown, Plus } from "lucide-react";
import CustomButton from "@/components/ui/CustomButton";
import { Input } from "@/components/ui/input";
import { filterSuggestions } from "@/lib/suggestions";
import { splitHighlightSegments } from "@/lib/searchHighlight";
import { cn } from "@/lib/utils";

interface SuggestionTagInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (overrideValue?: string) => void;
  suggestions: readonly string[];
  selectedItems: readonly string[];
  placeholder: string;
  addButtonLabel: string;
  suggestionsHeading: string;
  emptySuggestionsText?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export default function SuggestionTagInput({
  value,
  onChange,
  onAdd,
  suggestions,
  selectedItems,
  placeholder,
  addButtonLabel,
  suggestionsHeading,
  emptySuggestionsText,
  inputRef,
}: SuggestionTagInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? fallbackInputRef;
  const listboxId = useId();

  const filtered = useMemo(
    () => filterSuggestions(suggestions, value, selectedItems, 8),
    [suggestions, value, selectedItems]
  );

  const clampedActiveIndex =
    activeIndex >= 0 && activeIndex < filtered.length ? activeIndex : -1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectSuggestion = (item: string) => {
    onAdd(item);
    setActiveIndex(-1);
    resolvedInputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? 0 : -1);
      } else if (filtered.length > 0) {
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? filtered.length - 1 : -1);
      } else if (filtered.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      }
      return;
    }

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && clampedActiveIndex >= 0 && filtered[clampedActiveIndex]) {
        handleSelectSuggestion(filtered[clampedActiveIndex]);
      } else {
        onAdd();
      }
    }
  };

  const showDropdown = open && (filtered.length > 0 || Boolean(emptySuggestionsText));

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <div className="relative flex-1 min-w-0">
        <Input
          ref={resolvedInputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            clampedActiveIndex >= 0
              ? `${listboxId}-opt-${clampedActiveIndex}`
              : undefined
          }
          className="pr-9"
        />

        <button
          type="button"
          tabIndex={-1}
          aria-label={suggestionsHeading}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((prev) => !prev);
            resolvedInputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 top-full z-40 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-xl backdrop-blur-md"
          >
            <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {suggestionsHeading}
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-muted-foreground">
                {emptySuggestionsText}
              </div>
            ) : (
              filtered.map((item, idx) => {
                const segments = splitHighlightSegments(item, value);
                const isActive = idx === clampedActiveIndex;
                return (
                  <button
                    key={item}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelectSuggestion(item)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors border-b border-border/30 last:border-0",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    )}
                  >
                    <span className="min-w-0 break-words">
                      {segments.map((seg, i) =>
                        seg.highlighted ? (
                          <mark
                            key={i}
                            className="bg-primary/20 text-primary font-semibold px-0.5 rounded-sm"
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <CustomButton
        type="button"
        variant="outline"
        onClick={() => onAdd()}
        className="shrink-0 gap-1"
      >
        <Plus className="h-4 w-4" />
        {addButtonLabel}
      </CustomButton>
    </div>
  );
}
