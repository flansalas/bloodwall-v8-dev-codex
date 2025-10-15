"use client";

import Link from "next/link";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import Card from "@/components/ui/Card";

export default function MePageClient({ email }: { email: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <BackToDashboardButton />
      <div className="w-full max-w-xs">
        <div className="rounded-2xl border p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Me</div>
          <div className="mt-1 font-medium">You</div>
          <div className="text-sm text-gray-600">
            {email ? <>Signed in as <b>{email}</b></> : "Not signed in"}
          </div>
          <div className="mt-3">
            <Link href="/me" className="text-sm underline">Open profile →</Link>
          </div>
          <div className="mt-4 pt-3 border-t">
            <BackToDashboardButton label="Back to Dashboard" className="w-full justify-center" />
          </div>
        </div>
      </div>
    </div>
  );
}
