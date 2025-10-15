"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import clsx from "clsx";

type Props = {
  href?: string;
  label?: string;
  className?: string;
  variant?: "outline" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export default function BackToDashboardButton({
  href = "/",
  label = "← Dashboard",
  className,
  variant = "outline",
  size = "sm",
}: Props) {
  return (
    <Link
      href={href}
      className={clsx(buttonClasses(variant, size), className)}
    >
      {label}
    </Link>
  );
}
