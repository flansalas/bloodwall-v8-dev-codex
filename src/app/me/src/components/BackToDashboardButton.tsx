"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent, useCallback } from "react";

type BackToDashboardButtonProps = {
  label?: string;
  className?: string;
  href?: string;
};

export default function BackToDashboardButton({
  label = "Return to Dashboard",
  className = "",
  href = "/",
}: BackToDashboardButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      try {
        router.push(href);
      } catch {
        window.location.assign(href);
      }
    },
    [router, href],
  );

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:bg-gray-50 active:scale-[.98] ${className}`}
      aria-label={label}
    >
      ← {label}
    </Link>
  );
}
