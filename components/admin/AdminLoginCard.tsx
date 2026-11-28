"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";

export interface AdminLoginCardProps {
  showDevHint: boolean;
  onAuthenticated: () => void;
}

const DEV_TOKEN_HINT = "demo-health-token-secret";

export function AdminLoginCard({
  showDevHint,
  onAuthenticated,
}: AdminLoginCardProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Please enter your CMS Admin Token.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cms/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: trimmed }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        authenticated?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.authenticated) {
        setError(payload.error || "Invalid CMS Admin Token. Please try again.");
        return;
      }

      onAuthenticated();
    } catch {
      setError("Unable to reach authentication service. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto my-10 max-w-md">
      <div className="overflow-hidden rounded-card border border-brand-border bg-white shadow-card">
        <div className="bg-brand-navy px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-white shadow-sm">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Star Tech Custom CMS
              </h1>
              <p className="text-xs text-slate-300">
                Sign in to manage catalog products, specs, media &amp; categories
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="cms-admin-token"
              className="block text-xs font-semibold text-brand-textMain"
            >
              CMS Admin Token
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-textMuted"
                aria-hidden="true"
              />
              <input
                id="cms-admin-token"
                name="token"
                type={showToken ? "text" : "password"}
                autoComplete="current-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter CMS_ADMIN_TOKEN..."
                className="w-full rounded-control border border-brand-border bg-white py-2.5 pl-9 pr-10 text-sm text-brand-textMain placeholder:text-brand-textMuted focus:border-brand-blue focus:outline-none"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? "Hide token" : "Show token"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-brand-textMuted hover:text-brand-textMain"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-control border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
            >
              {error}
            </div>
          ) : null}

          {showDevHint ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  Local dev default:{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-950 ring-1 ring-amber-200">
                    {DEV_TOKEN_HINT}
                  </code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setToken(DEV_TOKEN_HINT);
                  setError(null);
                }}
                className="font-semibold text-brand-blue underline-offset-2 hover:underline"
              >
                Fill token
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-control bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In to CMS Dashboard"}
          </button>

          <div className="flex items-center justify-between border-t border-brand-border pt-3 text-xs text-brand-textMuted">
            <span>Protected by httpOnly signed session</span>
            <Link href="/" className="font-medium text-brand-blue hover:text-brand-orange">
              Back to Storefront
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
