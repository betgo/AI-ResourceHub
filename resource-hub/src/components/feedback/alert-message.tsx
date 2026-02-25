import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "error" | "warning" | "success" | "info";

type AlertMessageProps = {
  message: ReactNode;
  title?: string;
  variant?: AlertVariant;
  className?: string;
};

const variantClassName: Record<AlertVariant, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function AlertMessage({
  message,
  title,
  variant = "error",
  className,
}: AlertMessageProps) {
  const role = variant === "error" ? "alert" : "status";
  const live = variant === "error" ? "assertive" : "polite";

  return (
    <div
      role={role}
      aria-live={live}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-6",
        variantClassName[variant],
        className,
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div>{message}</div>
    </div>
  );
}
