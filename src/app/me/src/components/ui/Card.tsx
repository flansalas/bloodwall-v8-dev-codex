import clsx from "clsx";
import { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

const Card = ({ children, className }: CardProps) => (
  <div
    className={clsx(
      "rounded-[28px] border border-slate-200 bg-white/90 p-6",
      "shadow-[0_28px_60px_-48px_rgba(15,23,42,0.65)] backdrop-blur",
      className,
    )}
  >
    {children}
  </div>
);

export default Card;
