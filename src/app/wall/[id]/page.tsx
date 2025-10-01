"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Card from "@/components/Card";
import UDEDetailCard from "@/components/UDEDetailCard";
import { useUDEs } from "@/lib/udeStore";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const UDEDetailPage = () => {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const ude = useUDEs((state) => state.udes.find((item) => item.id === id));

  if (!ude) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center text-gray-700">
        <p className="text-lg font-semibold">We couldn’t find that UDE.</p>
        <Link href="/wall" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
          ← Back to Wall
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl space-y-6 bg-slate-50 p-6 text-slate-900 sm:p-10">
      <Card className="rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/wall" className="text-sm font-medium text-blue-600 transition hover:text-blue-700">
              ← Back to Wall
            </Link>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{ude.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">Owner {ude.owner}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{ude.category}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{formatCurrency(ude.costImpact)} / yr</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Due {formatDate(ude.dueDate)}</span>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {ude.status}
          </span>
        </div>
      </Card>

      <UDEDetailCard udeId={ude.id} />
    </div>
  );
};

export default UDEDetailPage;
