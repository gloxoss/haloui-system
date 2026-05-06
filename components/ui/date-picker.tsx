"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
  name,
  defaultValue,
  placeholder = "Sélectionner une date"
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [date, setDate] = React.useState<Date | undefined>(
    defaultValue ? parseISO(defaultValue) : undefined
  );

  // When value changes, format to YYYY-MM-DD for native forms
  const hiddenInputValue = date ? format(date, "yyyy-MM-dd") : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-xl border bg-[var(--card)] px-3 py-2 text-[13px] shadow-sm transition duration-200 hover:bg-[var(--background-alt)]",
            !date && "text-[var(--muted)]"
          )}
        >
          {date ? format(date, "dd MMM yyyy", { locale: fr }) : <span>{placeholder}</span>}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          locale={fr}
        />
      </PopoverContent>
      {/* Hidden input to work seamlessly with native form action */}
      <input type="hidden" name={name} value={hiddenInputValue} />
    </Popover>
  );
}
