"use client";
import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
};

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  ({ options, values, onChange, placeholder = "Select...", emptyMessage = "None selected", className }, ref) => {
    const [open, setOpen] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const onClick = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const toggle = (v: string) => {
      onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
    };

    const selectedLabels = values
      .map((v) => options.find((o) => o.value === v)?.label)
      .filter(Boolean) as string[];

    return (
      <div ref={wrapperRef} className={cn("relative", className)}>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          onClick={() => setOpen((o) => !o)}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selectedLabels.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedLabels.length <= 2 ? (
              selectedLabels.join(", ")
            ) : (
              `${selectedLabels.length} selected`
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="max-h-64 overflow-y-auto p-1">
              {options.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">{emptyMessage}</div>
              ) : (
                options.map((opt) => {
                  const checked = values.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left",
                        "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          checked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input"
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="flex-1">{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            {selectedLabels.length > 0 && (
              <div className="border-t p-2 flex flex-wrap gap-1">
                {selectedLabels.map((label, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => {
                        const v = options.find((o) => o.label === label)?.value;
                        if (v) toggle(v);
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
MultiSelect.displayName = "MultiSelect";

export { MultiSelect };