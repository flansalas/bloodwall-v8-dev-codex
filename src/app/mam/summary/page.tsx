"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useUDEs } from "@/lib/udeStore";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SummaryPage = () => {
  const udes = useUDEs((state) => state.udes);

  const {
    verifiedCount,
    verifiedCost,
    activeCount,
    needsWorkCount,
    newCount,
    statusLabel,
    tone,
    teamRows,
    actionsCompleted,
    actionsOutstanding,
  } = useMemo(() => {
    const verified = udes.filter((ude) => ude.status === "Verified");
    const active = udes.filter((ude) => ude.status === "Active");
    const needsWorkSet = new Set<string>();
    const newCutoff = new Date();
    newCutoff.setDate(newCutoff.getDate() - 7);

    udes.forEach((ude) => {
      ude.activityLog.forEach((log) => {
        if (log.message.toLowerCase().includes("needs work")) {
          needsWorkSet.add(ude.id);
        }
      });
    });

    const owners = new Map<string, { defined: number; active: number; verified: number; closed: number }>();
    udes.forEach((ude) => {
      if (!owners.has(ude.owner)) {
        owners.set(ude.owner, { defined: 0, active: 0, verified: 0, closed: 0 });
      }
      const bucket = owners.get(ude.owner)!;
      switch (ude.status) {
        case "Defined":
          bucket.defined += 1;
          break;
        case "Active":
          bucket.active += 1;
          break;
        case "Verified":
          bucket.verified += 1;
          break;
        case "Closed":
          bucket.closed += 1;
          break;
      }
    });

    const actionsTotal = udes.reduce((total, ude) => total + ude.actions.length, 0);
    const actionsDone = udes.reduce(
      (total, ude) => total + ude.actions.filter((action) => action.status === "Done").length,
      0,
    );

    const verifiedCost = verified.reduce((sum, ude) => sum + ude.costImpact, 0);
    const needsWorkCount = needsWorkSet.size;
    const verifiedCount = verified.length;
    const activeCount = active.length;
    const newCount = udes.filter((ude) => {
      const firstLog = ude.activityLog[0];
      if (!firstLog) return false;
      const ts = new Date(firstLog.timestamp);
      if (Number.isNaN(ts.getTime())) return false;
      return ts >= newCutoff;
    }).length;

    let statusLabel = "Steady";
    let tone: "verified" | "needs" | "active" = "active";
    if (verifiedCount > needsWorkCount) {
      statusLabel = "Accountability Improving";
      tone = "verified";
    } else if (needsWorkCount > verifiedCount) {
      statusLabel = "Accountability At Risk";
      tone = "needs";
    }

    const teamRows = Array.from(owners.entries())
      .map(([owner, counts]) => ({ owner, ...counts }))
      .sort((a, b) => a.owner.localeCompare(b.owner));

    return {
      verifiedCount,
      verifiedCost,
      activeCount,
      needsWorkCount,
      newCount,
      statusLabel,
      tone,
      teamRows,
      actionsCompleted: actionsDone,
      actionsOutstanding: actionsTotal - actionsDone,
    };
  }, [udes]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Meeting Summary</p>
          <h1 className="text-3xl font-semibold tracking-tight">Accountability Snapshot</h1>
          <Badge tone={tone} className="mt-2">{statusLabel}</Badge>
        </div>
        <Link href="/" className={buttonClasses("primary", "sm")}>Return to Dashboard</Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Verified" value={`${verifiedCount}`} sub={currency.format(verifiedCost)} tone="verified" />
        <SummaryCard title="Active" value={`${activeCount}`} tone="active" />
        <SummaryCard title="Needs Work" value={`${needsWorkCount}`} tone="needs" />
        <SummaryCard title="New UDEs" value={`${newCount}`} tone="default" />
      </div>

      <Card className="my-8 rounded-[32px] p-6">
        <h2 className="text-lg font-semibold text-slate-900">Team Breakdown</h2>
        <table className="mt-4 w-full table-fixed text-left text-sm text-slate-600">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2">Owner</th>
              <th className="pb-2">Defined</th>
              <th className="pb-2">Active</th>
              <th className="pb-2">Verified</th>
              <th className="pb-2">Closed</th>
            </tr>
          </thead>
          <tbody>
            {teamRows.map((row) => (
              <tr key={row.owner} className="border-t border-slate-200">
                <td className="py-3 font-medium text-slate-800">{row.owner}</td>
                <td>{row.defined}</td>
                <td>{row.active}</td>
                <td>
                  <Badge tone="verified">{row.verified}</Badge>
                </td>
                <td>{row.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[32px]">
          <h2 className="text-lg font-semibold text-slate-900">Actions Summary</h2>
          <p className="mt-2 text-sm text-slate-600">Completed vs outstanding action items.</p>
          <div className="mt-4 flex items-center gap-3">
            <Badge tone="verified">Completed {actionsCompleted}</Badge>
            <Badge tone="needs">Outstanding {actionsOutstanding}</Badge>
          </div>
          <div className="mt-6 h-32 rounded-3xl bg-slate-100 text-center text-sm text-slate-400">
            <div className="flex h-full items-center justify-center">Bar chart coming soon</div>
          </div>
        </Card>
        <Card className="rounded-[32px]">
          <h2 className="text-lg font-semibold text-slate-900">Trendline</h2>
          <p className="mt-2 text-sm text-slate-600">$ Eliminated over time.</p>
          <div className="mt-6 h-32 rounded-3xl bg-slate-100 text-center text-sm text-slate-400">
            <div className="flex h-full items-center justify-center">Line chart coming soon</div>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Link href="/wall" className={buttonClasses("outline", "sm")}>
          ← Back to Wall
        </Link>
      </div>
    </div>
  );
};

export default SummaryPage;

const SummaryCard = ({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  tone: "verified" | "active" | "needs" | "default";
}) => {
  const toneClasses: Record<typeof tone, string> = {
    verified: "bg-emerald-50 text-emerald-700",
    active: "bg-blue-50 text-blue-700",
    needs: "bg-amber-50 text-amber-700",
    default: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className={`rounded-[28px] text-center ${toneClasses[tone]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </Card>
  );
};
