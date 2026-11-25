"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  contactSchema,
  extractFieldErrors,
  type ContactFieldErrors,
  type ContactFieldName,
} from "@/lib/contact/schema";

interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  honeypot: string;
}

const INITIAL_VALUES: ContactFormValues = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  honeypot: "",
};

const FIELD_ORDER: readonly ContactFieldName[] = [
  "name",
  "email",
  "phone",
  "subject",
  "message",
];

function validateSingleField(
  field: ContactFieldName,
  value: string
): string | undefined {
  const result = contactSchema.shape[field].safeParse(value);
  if (result.success) {
    return undefined;
  }
  return result.error.issues[0]?.message;
}

function setFieldErrorValue(
  prev: ContactFieldErrors,
  field: ContactFieldName,
  error: string | undefined
): ContactFieldErrors {
  if (!error) {
    if (!(field in prev)) {
      return prev;
    }
    const next = { ...prev };
    delete next[field];
    return next;
  }
  if (prev[field] === error) {
    return prev;
  }
  return { ...prev, [field]: error };
}

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<ContactFieldName, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const [pendingFocus, setPendingFocus] = useState<{
    field: ContactFieldName;
    seq: number;
  } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const fieldRefs = useRef<
    Partial<Record<ContactFieldName, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAnnounceTimer = () => {
    if (announceTimerRef.current !== null) {
      clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAnnounceTimer();
    };
  }, []);

  useEffect(() => {
    if (!pendingFocus) {
      return;
    }
    fieldRefs.current[pendingFocus.field]?.focus();
  }, [pendingFocus]);

  const queueFocusField = (field: ContactFieldName) => {
    setPendingFocus((prev) => ({
      field,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleFieldChange = (field: ContactFieldName, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (fieldErrors[field] || touched[field] || submitAttempted) {
      const nextErr = validateSingleField(field, value);
      setFieldErrors((prev) => setFieldErrorValue(prev, field, nextErr));
      if (!nextErr) {
        clearAnnounceTimer();
        setLiveAnnouncement("");
      }
    }
  };

  const handleFieldBlur = (field: ContactFieldName) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

    const nextErr = validateSingleField(field, formData[field]);
    const prevErr = fieldErrors[field];
    setFieldErrors((prev) => setFieldErrorValue(prev, field, nextErr));

    clearAnnounceTimer();
    if (nextErr) {
      if (!prevErr || prevErr !== nextErr) {
        announceTimerRef.current = setTimeout(() => {
          setLiveAnnouncement(nextErr);
        }, 400);
      }
    } else {
      setLiveAnnouncement("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearAnnounceTimer();
    setLiveAnnouncement("");
    setSubmitAttempted(true);
    setTouched({
      name: true,
      email: true,
      phone: true,
      subject: true,
      message: true,
    });

    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      const nextErrors = extractFieldErrors(parsed.error);
      setFieldErrors(nextErrors);
      const firstInvalid = FIELD_ORDER.find((field) => Boolean(nextErrors[field]));
      if (firstInvalid) {
        queueFocusField(firstInvalid);
      } else {
        setStatus("error");
        setStatusMsg("Invalid submission.");
      }
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setStatusMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (
          res.status === 400 &&
          data.fieldErrors &&
          typeof data.fieldErrors === "object" &&
          !Array.isArray(data.fieldErrors)
        ) {
          const rawFieldErrors = data.fieldErrors as Record<string, unknown>;
          const mappedErrors: ContactFieldErrors = {};
          for (const field of FIELD_ORDER) {
            const msg = rawFieldErrors[field];
            if (typeof msg === "string" && msg.trim().length > 0) {
              mappedErrors[field] = msg;
            }
          }

          if (Object.keys(mappedErrors).length > 0) {
            setFieldErrors(mappedErrors);
            const firstServerInvalid = FIELD_ORDER.find((field) =>
              Boolean(mappedErrors[field])
            );
            if (firstServerInvalid) {
              queueFocusField(firstServerInvalid);
            }
          }
        }

        setStatus("error");
        setStatusMsg(
          typeof data.error === "string" && data.error.trim().length > 0
            ? data.error
            : "We could not submit your message. Please try again."
        );
        return;
      }

      setStatus("success");
      setStatusMsg(
        typeof data.message === "string" && data.message.trim().length > 0
          ? data.message
          : "Thank you for contacting Star Tech! We have received your inquiry."
      );
      setFormData(INITIAL_VALUES);
      setTouched({});
      setFieldErrors({});
      setSubmitAttempted(false);
      setLiveAnnouncement("");
      formRef.current?.reset();
    } catch {
      setStatus("error");
      setStatusMsg(
        "Unable to send your message right now. Please check your connection and try again, or call 16793."
      );
    }
  };

  const getInputClassName = (field: ContactFieldName, basePadding: string) =>
    `contact-input w-full ${basePadding} text-sm border rounded bg-white text-brand-textMain transition-colors ${
      fieldErrors[field]
        ? "border-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
        : "border-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
    }`;

  return (
    <div className="md:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
      <h2 id="contact-form-heading" className="text-base font-bold text-brand-textMain mb-4">
        Send Us a Message
      </h2>

      {status === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{statusMsg}</span>
        </div>
      )}

      <form
        ref={formRef}
        noValidate
        action="/api/contact"
        method="POST"
        aria-labelledby="contact-form-heading"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {/* Single polite live region for delayed blur validation announcements */}
        <div aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>

        {/* Honeypot field hidden from genuine users and assistive technology */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website-hp">Leave this field empty</label>
          <input
            id="website-hp"
            name="honeypot"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData.honeypot}
            onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-name" className="block font-semibold text-gray-700 mb-1">
              Your Full Name <span aria-hidden="true">*</span>
            </label>
            <input
              ref={(el) => {
                fieldRefs.current.name = el;
              }}
              id="contact-name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              aria-invalid={fieldErrors.name ? "true" : "false"}
              aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              onBlur={() => handleFieldBlur("name")}
              placeholder="e.g. John Doe"
              className={getInputClassName("name", "min-h-[44px] px-3")}
            />
            {fieldErrors.name ? (
              <p
                id="contact-name-error"
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{fieldErrors.name}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="contact-email" className="block font-semibold text-gray-700 mb-0.5">
              Email Address <span aria-hidden="true">*</span>
            </label>
            <p id="contact-email-hint" className="text-[11px] text-brand-textMuted mb-1">
              Format: you@example.com
            </p>
            <input
              ref={(el) => {
                fieldRefs.current.email = el;
              }}
              id="contact-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={fieldErrors.email ? "true" : "false"}
              aria-describedby={
                fieldErrors.email
                  ? "contact-email-hint contact-email-error"
                  : "contact-email-hint"
              }
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              onBlur={() => handleFieldBlur("email")}
              placeholder="you@example.com"
              className={getInputClassName("email", "min-h-[44px] px-3")}
            />
            {fieldErrors.email ? (
              <p
                id="contact-email-error"
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{fieldErrors.email}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-phone" className="block font-semibold text-gray-700 mb-0.5">
              Phone Number
            </label>
            <p id="contact-phone-hint" className="text-[11px] text-brand-textMuted mb-1">
              Optional — used only to follow up on your inquiry.
            </p>
            <input
              ref={(el) => {
                fieldRefs.current.phone = el;
              }}
              id="contact-phone"
              name="phone"
              type="tel"
              maxLength={20}
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={fieldErrors.phone ? "true" : "false"}
              aria-describedby={
                fieldErrors.phone
                  ? "contact-phone-hint contact-phone-error"
                  : "contact-phone-hint"
              }
              value={formData.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              onBlur={() => handleFieldBlur("phone")}
              placeholder="01XXXXXXXXX"
              className={getInputClassName("phone", "min-h-[44px] px-3")}
            />
            {fieldErrors.phone ? (
              <p
                id="contact-phone-error"
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{fieldErrors.phone}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="contact-subject" className="block font-semibold text-gray-700 mb-1">
              Subject <span aria-hidden="true">*</span>
            </label>
            <input
              ref={(el) => {
                fieldRefs.current.subject = el;
              }}
              id="contact-subject"
              name="subject"
              type="text"
              required
              minLength={3}
              maxLength={150}
              aria-invalid={fieldErrors.subject ? "true" : "false"}
              aria-describedby={
                fieldErrors.subject ? "contact-subject-error" : undefined
              }
              value={formData.subject}
              onChange={(e) => handleFieldChange("subject", e.target.value)}
              onBlur={() => handleFieldBlur("subject")}
              placeholder="Inquiry about..."
              className={getInputClassName("subject", "min-h-[44px] px-3")}
            />
            {fieldErrors.subject ? (
              <p
                id="contact-subject-error"
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{fieldErrors.subject}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="block font-semibold text-gray-700 mb-1">
            Your Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            ref={(el) => {
              fieldRefs.current.message = el;
            }}
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            aria-invalid={fieldErrors.message ? "true" : "false"}
            aria-describedby={
              fieldErrors.message ? "contact-message-error" : undefined
            }
            value={formData.message}
            onChange={(e) => handleFieldChange("message", e.target.value)}
            onBlur={() => handleFieldBlur("message")}
            placeholder="Type your question or feedback here..."
            className={getInputClassName("message", "p-3")}
          />
          {fieldErrors.message ? (
            <p
              id="contact-message-error"
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-700"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{fieldErrors.message}</span>
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={status === "loading"}
          className="gap-2"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{status === "loading" ? "Sending..." : "Submit Message"}</span>
        </Button>
      </form>
    </div>
  );
}
