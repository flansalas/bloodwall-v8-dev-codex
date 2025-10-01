import clsx from "clsx";
import { ForwardedRef, InputHTMLAttributes, forwardRef } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  pill?: boolean;
};

const Input = ({ className, pill = true, ...props }: InputProps, ref: ForwardedRef<HTMLInputElement>) => (
  <input
    ref={ref}
    className={clsx(
      "w-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm",
      pill ? "rounded-full" : "rounded-lg",
      "focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100",
      "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
      className,
    )}
    {...props}
  />
);

export default forwardRef<HTMLInputElement, InputProps>(Input);
