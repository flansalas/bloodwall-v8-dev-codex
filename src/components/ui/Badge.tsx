import clsx from "clsx";
import { PropsWithChildren } from "react";

export type BadgeTone =
  | "default"
  | "active"
  | "verified"
  | "closed"
  | "needs"
  | "danger";

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone;
  className?: string;
}>;

const toneStyles: Record<BadgeTone, string> = {
  default: "bg-slate-100 text-slate-600",
  active: "bg-blue-100 text-blue-700",
  verified: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-900 text-white",
  needs: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

const Badge = ({ children, tone = "default", className }: BadgeProps) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
      toneStyles[tone],
      className,
    )}
  >
    {children}
  </span>
);

export default Badge;
