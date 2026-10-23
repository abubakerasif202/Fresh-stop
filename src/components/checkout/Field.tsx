import type { InputHTMLAttributes } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "id" | "name"> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

const INPUT = "min-h-11 w-full min-w-0 max-w-full rounded-xl border bg-white px-3.5 py-2.5 text-base focus-visible:outline-3 focus-visible:outline-citrus sm:text-sm";

/** Labelled input whose error is announced (aria-invalid + aria-describedby) and linked to the field. */
export function Field({ id, label, value, onChange, error, hint, required = false, className = "", ...rest }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-ink">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...rest}
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT} ${error ? "border-brand-red" : "border-forest/20"}`}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-bold text-brand-red">{error}</p>}
    </div>
  );
}
