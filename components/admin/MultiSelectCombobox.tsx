"use client";

import { ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboOption = { value: string; count: number };

/**
 * Searchable multi-select over a fixed list (e.g. departments in the employee
 * master). Selected values show as removable chips; the list stays open while
 * ticking several. Previously-saved values that no longer exist stay visible so
 * they can be removed.
 */
export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  noun,
}: {
  options: ComboOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Singular label, e.g. "department". */
  noun: string;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = (v: string) => selected.some((s) => s.toLowerCase() === v.toLowerCase());
  const toggle = (v: string) => onChange(isSelected(v) ? selected.filter((s) => s.toLowerCase() !== v.toLowerCase()) : [...selected, v]);
  const stale = selected.filter((s) => !options.some((o) => o.value.toLowerCase() === s.toLowerCase()));

  return (
    <div className="grid gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2.5 text-xs">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => toggle(v)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Select ${noun}s`}
            className="h-9 w-full max-w-sm justify-between bg-card font-normal text-muted-foreground"
          >
            {selected.length ? `${selected.length} ${noun}${selected.length === 1 ? "" : "s"} selected` : `Select ${noun}s…`}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${noun}s…`} />
            <CommandList>
              <CommandEmpty>
                {options.length ? `No matching ${noun}.` : `No ${noun}s in the employee master yet — run the HRMS sync first.`}
              </CommandEmpty>
              {stale.length > 0 && (
                <CommandGroup heading="Not in the employee master">
                  {stale.map((v) => (
                    <CommandItem key={`stale-${v}`} value={`stale ${v}`} data-checked onSelect={() => toggle(v)}>
                      {v}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.value} value={o.value} data-checked={isSelected(o.value)} onSelect={() => toggle(o.value)}>
                    {/* Label takes the free space so the count sits right next to the check mark. */}
                    <span className="flex-1 truncate">{o.value}</span>
                    <span className="text-xs text-muted-foreground tabular-nums" title={`${o.count} active employees`}>
                      {o.count}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <Button type="button" variant="ghost" size="sm" className="w-full justify-center" onClick={() => onChange([])}>
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
