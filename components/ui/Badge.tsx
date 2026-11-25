import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "sale";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";

  const variants = {
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    error: "bg-rose-100 text-rose-800 border border-rose-200",
    info: "bg-blue-100 text-blue-800 border border-blue-200",
    neutral: "bg-gray-100 text-gray-800 border border-gray-200",
    sale: "bg-brand-orange text-white font-semibold",
  };

  return (
    <span
      className={twMerge(clsx(base, variants[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
}
