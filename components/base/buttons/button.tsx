"use client";

import React from "react";

type ButtonColor = "primary" | "secondary" | "ghost" | "primary-destructive" | "secondary-destructive";
type ButtonSize  = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?:       ButtonColor;
  size?:        ButtonSize;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  loading?:     boolean;
  children?:    React.ReactNode;
}

const base = [
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg",
  "transition-all duration-150 select-none whitespace-nowrap",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
  "disabled:opacity-40 disabled:cursor-not-allowed",
].join(" ");

const colors: Record<ButtonColor, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.98] focus-visible:outline-[var(--accent)] shadow-sm",
  secondary:
    "bg-transparent text-[var(--t1)] border border-[var(--border-2)] hover:bg-[var(--accent-dim)] active:scale-[0.98] focus-visible:outline-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--t2)] hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.98] focus-visible:outline-[var(--accent)]",
  "primary-destructive":
    "bg-[var(--red)] text-white hover:opacity-90 active:scale-[0.98] focus-visible:outline-[var(--red)] shadow-sm",
  "secondary-destructive":
    "bg-transparent text-[var(--red)] border border-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] active:scale-[0.98] focus-visible:outline-[var(--red)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12px] gap-1",
  md: "h-9 px-4 text-[13px] gap-1.5",
  lg: "h-10 px-5 text-[14px] gap-2",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-[18px] h-[18px]",
};

export function Button({
  color = "primary",
  size  = "md",
  iconLeading,
  iconTrailing,
  loading,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const cls = `${base} ${colors[color]} ${sizes[size]} ${className}`;
  const iconCls = iconSizes[size];

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        <svg className={`${iconCls} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : iconLeading ? (
        <span className={iconCls} style={{ display:"contents" }}>{iconLeading}</span>
      ) : null}
      {children}
      {!loading && iconTrailing && (
        <span className={iconCls} style={{ display:"contents" }}>{iconTrailing}</span>
      )}
    </button>
  );
}
