import clsx from "clsx";
import { ButtonHTMLAttributes, PropsWithChildren } from "react";

export type ButtonVariant = "primary" | "success" | "warning" | "danger" | "outline" | "ghost";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md" | "lg";
  }
>;

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  warning: "bg-amber-500 text-slate-900 hover:bg-amber-400",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  outline: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const buttonClasses = (
  variant: ButtonVariant = "primary",
  size: NonNullable<ButtonProps["size"]> = "md",
  className?: string,
) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
    "focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

const Button = ({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) => (
  <button className={buttonClasses(variant, size, className)} {...props}>
    {children}
  </button>
);

export default Button;
