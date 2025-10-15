"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import UDEDetailCard from "@/components/UDEDetailCard";
import { useUDEs } from "@/lib/udeClientStore";

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
    <div className="mx-auto min-h-screen max-w-4xl bg-slate-50 p-6 text-slate-900 sm:p-10">
      <div className="mb-4">
        <Link href="/wall" className="text-sm font-medium text-blue-600 transition hover:text-blue-700">
          ← Back to Wall
        </Link>
      </div>
      <UDEDetailCard udeId={Number(ude.id)} />
    </div>
  );
};

export default UDEDetailPage;
