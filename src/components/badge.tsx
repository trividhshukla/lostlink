import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "lost" | "found" | "neutral" | "restricted" | "active" | "accepted" | "resolved" | "outline";
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  const variantStyles = {
    lost: "bg-amber-100/90 text-amber-950 border-amber-300/80 shadow-xs",
    found: "bg-emerald-100/90 text-emerald-950 border-emerald-300/80 shadow-xs",
    neutral: "bg-stone-100 text-stone-800 border-stone-200/90",
    restricted: "bg-purple-100/90 text-purple-950 border-purple-200",
    active: "bg-emerald-50 text-emerald-900 border-emerald-200",
    accepted: "bg-sky-50 text-sky-900 border-sky-200",
    resolved: "bg-stone-100 text-stone-600 border-stone-200",
    outline: "bg-transparent text-stone-700 border-stone-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
