import Link from "next/link";
import BackToDashboardButton from "./BackToDashboardButton";

export default function MeCard() {
  // No auth yet: show a generic "You" card with a link to /me
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">Me</div>
      <div className="mt-1 font-medium">You</div>
      <div className="text-sm text-gray-600">Role: Owner (demo)</div>
      <div className="mt-3">
        <Link href="/me" className="text-sm underline">Open profile →</Link>
      </div>
      <div className="mt-4">
        <BackToDashboardButton label="Dashboard" className="w-full justify-center border-gray-200" />
      </div>
    </div>
  );
}
