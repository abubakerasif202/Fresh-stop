"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CONTACT } from "@/lib/contact";

export type EnquiryFormKind = "WHOLESALE" | "CONTACT";

export interface EnquiryFormProps {
  kind: EnquiryFormKind;
  className?: string;
}

type Values = Readonly<Record<"name" | "businessName" | "email" | "phone" | "products" | "estimatedQuantity" | "message", string>>;
type Errors = Readonly<Record<string, string>>;
type Phase = "idle" | "submitting" | "sent" | "error";

const EMPTY: Values = { name: "", businessName: "", email: "", phone: "", products: "", estimatedQuantity: "", message: "" };
const INPUT = "min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base focus-visible:outline-3 focus-visible:outline-citrus sm:text-sm";
const BUTTON = "inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 text-sm font-bold text-white transition hover:bg-forest/90 focus-visible:outline-3 focus-visible:outline-citrus disabled:cursor-not-allowed disabled:opacity-60";
const REQUEST_TIMEOUT_MS = 15_000;

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

function FieldShell({ id, label, required = false, error, hint, children }: FieldShellProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-ink">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children(describedBy)}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-bold text-brand-red">{error}</p>}
    </div>
  );
}

/** Client-side hints only; the server validates everything again. */
function checkLocally(kind: EnquiryFormKind, v: Values): Errors {
  const errors: Record<string, string> = {};
  if (!v.name.trim()) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) errors.email = "Please enter a valid email address.";
  if (v.phone.replace(/[^\d+]/g, "").length < 8) errors.phone = "Please enter a valid phone number.";
  if (kind === "WHOLESALE") {
    if (!v.businessName.trim()) errors.businessName = "Please enter your business name.";
    if (!v.products.trim()) errors.products = "Please tell us which products you need.";
  } else if (!v.message.trim()) {
    errors.message = "Please write a message.";
  }
  return errors;
}

/**
 * Wholesale / contact enquiry form. Posts to /api/enquiries.
 * Success is shown only once the server has stored the enquiry; the copy never promises more than that.
 */
export function EnquiryForm({ kind, className = "" }: EnquiryFormProps) {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const wholesale = kind === "WHOLESALE";
  const id = (name: string) => `${uid}-${name}`;
  const set = (name: keyof Values) => (value: string) => setValues((current) => ({ ...current, [name]: value }));
  const submitting = phase === "submitting";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const local = checkLocally(kind, values);
    setErrors(local);
    if (Object.keys(local).length > 0) {
      setPhase("idle");
      setNotice("Please fix the highlighted fields.");
      return;
    }
    setPhase("submitting");
    setNotice("");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...values, website: trap }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      const data: { fields?: Record<string, string>; error?: string } = await response.json().catch(() => ({}));
      if (response.ok) {
        setValues(EMPTY);
        setPhase("sent");
        return;
      }
      setErrors(data.fields ?? {});
      setPhase("error");
      setNotice(data.error ?? `We could not send your enquiry. Please call ${CONTACT.phoneDisplay} or email ${CONTACT.email}.`);
    } catch {
      setPhase("error");
      setNotice(`We could not reach the server. Please check your connection, or call ${CONTACT.phoneDisplay}.`);
    }
  }

  if (phase === "sent") {
    return (
      <div role="status" className={`rounded-2xl border border-forest/20 bg-leaf-soft p-6 ${className}`.trim()}>
        <h3 className="font-display text-xl font-black text-forest">Thank you, we have your enquiry</h3>
        <p className="mt-2 text-sm text-ink-soft">
          It has been saved and the team will reply by email or phone. If it is urgent, call {CONTACT.phoneDisplay}.
        </p>
        <button type="button" onClick={() => setPhase("idle")} className={`${BUTTON} mt-4`}>Send another enquiry</button>
      </div>
    );
  }

  const renderInput = (name: keyof Values, describedBy: string | undefined, extra: { type?: string; autoComplete?: string; required?: boolean; inputMode?: "tel" | "email" } = {}) => (
    <input
      id={id(name)}
      name={name}
      value={values[name]}
      onChange={(e) => set(name)(e.target.value)}
      type={extra.type ?? "text"}
      autoComplete={extra.autoComplete}
      inputMode={extra.inputMode}
      required={extra.required}
      disabled={submitting}
      aria-invalid={errors[name] ? true : undefined}
      aria-describedby={describedBy}
      className={`${INPUT} ${errors[name] ? "border-brand-red" : "border-forest/20"}`}
    />
  );
  const renderArea = (name: "products" | "message", rows: number, describedBy: string | undefined) => (
    <textarea
      id={id(name)}
      name={name}
      value={values[name]}
      onChange={(e) => set(name)(e.target.value)}
      rows={rows}
      disabled={submitting}
      aria-invalid={errors[name] ? true : undefined}
      aria-describedby={describedBy}
      className={`${INPUT} ${errors[name] ? "border-brand-red" : "border-forest/20"}`}
    />
  );

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting} className={`grid gap-4 ${className}`.trim()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell id={id("name")} label="Your name" required error={errors.name}>{(d) => renderInput("name", d, { autoComplete: "name", required: true })}</FieldShell>
        {wholesale && <FieldShell id={id("businessName")} label="Business name" required error={errors.businessName}>{(d) => renderInput("businessName", d, { autoComplete: "organization", required: true })}</FieldShell>}
        <FieldShell id={id("email")} label="Email" required error={errors.email}>{(d) => renderInput("email", d, { type: "email", autoComplete: "email", inputMode: "email", required: true })}</FieldShell>
        <FieldShell id={id("phone")} label="Phone" required error={errors.phone} hint="For example 0423 936 586">{(d) => renderInput("phone", d, { type: "tel", autoComplete: "tel", inputMode: "tel", required: true })}</FieldShell>
      </div>
      {wholesale && (
        <>
          <FieldShell id={id("products")} label="Products you need" required error={errors.products}>{(d) => renderArea("products", 4, d)}</FieldShell>
          <FieldShell id={id("estimatedQuantity")} label="Estimated quantity" error={errors.estimatedQuantity} hint="For example 20 boxes weekly">{(d) => renderInput("estimatedQuantity", d)}</FieldShell>
        </>
      )}
      <FieldShell id={id("message")} label={wholesale ? "Anything else we should know" : "Your message"} required={!wholesale} error={errors.message}>{(d) => renderArea("message", wholesale ? 3 : 5, d)}</FieldShell>

      {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped server-side. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={id("website")}>Leave this field empty</label>
        <input id={id("website")} name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className={BUTTON}>{submitting ? "Sending..." : "Send enquiry"}</button>
        <p role={phase === "error" || Object.keys(errors).length ? "alert" : "status"} aria-live="polite" className={`min-h-5 text-sm ${phase === "error" ? "font-bold text-brand-red" : "text-ink-soft"}`}>{notice}</p>
      </div>
    </form>
  );
}
