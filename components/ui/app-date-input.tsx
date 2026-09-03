"use client";

import * as React from "react";
import { DateInput } from "@mantine/dates";
import { Calendar } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export function AppDateInput({
  value,
  defaultValue,
  onChange,
  name,
  label,
  placeholder = "jj/mm/aaaa",
  disabled,
  clearable = true,
  required,
  className,
}: {
  value?: string; // Format: YYYY-MM-DD
  defaultValue?: string; // Format: YYYY-MM-DD
  onChange?: (val: string) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState<string | null>(() => {
    return value ?? defaultValue ?? null;
  });

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value || null);
    }
  }, [value]);

  const handleChange = (val: string | null) => {
    setInternalValue(val);
    onChange?.(val || "");
  };

  return (
    <div className={className}>
      {name ? <input type="hidden" name={name} value={internalValue || ""} /> : null}
      <DateInput
        label={label}
        value={internalValue}
        onChange={handleChange}
        valueFormat="DD/MM/YYYY"
        placeholder={placeholder}
        disabled={disabled}
        clearable={clearable}
        required={required}
        locale="fr"
        radius="xl"
        leftSection={<Calendar size={15} strokeWidth={1.8} className="text-[var(--muted)]" />}
        styles={{
          input: {
            backgroundColor: "var(--card)",
            borderColor: "var(--border-strong)",
            color: "var(--foreground)",
            fontWeight: 500,
            fontSize: "13px",
            height: "42px",
            borderRadius: "14px",
          },
          calendarHeader: {
            color: "var(--foreground)",
            fontWeight: 700,
          },
        }}
      />
    </div>
  );
}
