"use client";

import Link from "next/link";
import { useMemo } from "react";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useUDEs, type MamSummary } from "@/lib/udeClientStore";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SummaryPage = () => {
  const summary = useUDEs((state) => state.latestMamSummary);
  const company = useUDEs((state) => state.company);
  const udes = useUDEs((state) => state.udes);

  const fallbackSummary = useMemo<MamSummary>(() => {
    const costEliminated = udes.filter((ude) => ude.status === "Verified").reduce((acc, ude) => acc + ude.costImpact, 0);
    const costAtRisk = udes.filter((ude) => ude.status === "Defined" || ude.status === "Active").reduce((acc, ude) => acc + ude.costImpact, 0);
    return {
      timestamp: new Date().toISOString(),
      agendaTotal: udes.filter((ude) => ude.status === "Active").length,
      reviewed: 0,
      verified: udes.filter((ude) => ude.status === "Verified").length,
      keptActive: udes.filter((ude) => ude.status === "Active").length,
      needsWork: 0,
      newLogged: udes.filter((ude) => ude.status === "Defined").length,
      costEliminated,
      costAtRisk,
      reviewedOwners: {} as Record<string, number>,
      actionsCompleted: udes.reduce(
        (total, ude) => total + ude.actions.filter((action) => action.status === "Done").length,
        0,
      ),
      actionsOutstanding: udes.reduce(
        (total, ude) => total + ude.actions.filter((action) => action.status !== "Done").length,
        0,
      ),
    } as MamSummary;
  }, [udes]);

  const data = summary ?? fallbackSummary;
  const accountabilityRatio = data.agendaTotal === 0 ? 1 : data.verified / data.agendaTotal;

  const statusTone = accountabilityRatio >= 0.7 ? "verified" : accountabilityRatio >= 0.4 ? "active" : "danger";
  const statusLabel = accountabilityRatio >= 0.7 ? "Green Loop" : accountabilityRatio >= 0.4 ? "Yellow Loop" : "Red Loop";
  const statusDescription = accountabilityRatio >= 0.7
    ? "Verified ≥ 70%. Momentum is healthy."
    : accountabilityRatio >= 0.4
      ? "Verified 40–69%. Focus the next cycle."
      : "Verified < 40%. Remove blockers immediately.";

  const actionTotal = data.actionsCompleted + data.actionsOutstanding;
  const actionPct = actionTotal === 0 ? 0 : Math.round((data.actionsCompleted / actionTotal) * 100);

  const sortedOwners = Object.entries(data.reviewedOwners)
    .sort((a, b) => b[1] - a[1])
    .map(([owner, count]) => ({ owner, count }));

  const trendPoints = buildTrendLine(data.costEliminated, data.costAtRisk);
  const bannerGradients: Record<"verified" | "active" | "danger", string> = {
    verified: "from-emerald-500 via-emerald-400 to-emerald-600",
    active: "from-amber-400 via-orange-400 to-amber-600",
    danger: "from-rose-500 via-rose-600 to-rose-700",
  };
  const bannerGradient = bannerGradients[statusTone === "danger" ? "danger" : statusTone];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MAM Summary</p>
          <h1 className="text-3xl font-semibold tracking-tight">{company.name} Accountability Pulse</h1>
          <p className="mt-2 text-sm text-slate-500">Session completed {new Date(data.timestamp).toLocaleString()}</p>
        </div>
        <BackToDashboardButton variant="primary" />
      </header>

      <Card className={`mb-6 flex flex-wrap items-center justify-between gap-6 rounded-[36px] bg-gradient-to-br ${bannerGradient} p-8 text-white shadow-[0_60px_120px_-80px_rgba(15,23,42,0.8)]`}>
        <div>
          <Badge tone={statusTone === "danger" ? "danger" : statusTone} className="bg-white/10 text-white">
            {statusLabel}
          </Badge>
          <p className="mt-3 max-w-xl text-sm text-white/70">{statusDescription}</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-wide text-white/60">Verified</p>
          <p className="text-4xl font-semibold">{data.verified} / {data.agendaTotal || data.reviewed}</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Verified" value={data.verified} accent="verified" sub={currency.format(data.costEliminated)} />
        <MetricCard title="Still Active" value={data.keptActive} accent="active" sub={`${data.reviewed} reviewed`} />
        <MetricCard title="Needs Work" value={data.needsWork} accent="danger" sub="Follow-ups required" />
        <MetricCard title="New UDEs" value={data.newLogged} accent="default" sub="Logged this cycle" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 rounded-[32px] p-6">
          <h2 className="text-lg font-semibold text-slate-900">Team Leaderboard</h2>
          <p className="text-sm text-slate-500">Top reviewers this session.</p>
          {sortedOwners.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-slate-100 px-5 py-8 text-center text-sm text-slate-500">
              No agenda items were reviewed.
            </div>
          ) : (
            <ol className="mt-6 space-y-3">
              {sortedOwners.map(({ owner, count }, index) => (
                <li key={owner} className="flex items-center justify-between rounded-[24px] bg-slate-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{owner}</p>
                      <p className="text-xs text-slate-500">{count} reviewed</p>
                    </div>
                  </div>
                  <Badge tone="verified">{count}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="lg:col-span-2 rounded-[32px] p-6">
          <h2 className="text-lg font-semibold text-slate-900">Actions Summary</h2>
          <p className="text-sm text-slate-500">{data.actionsCompleted} completed · {data.actionsOutstanding} outstanding</p>
          <div className="mt-6 h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${actionPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{actionPct}% action completion.</p>
        </Card>
      </div>

      <Card className="mt-8 rounded-[32px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Cost Trend</h2>
            <p className="text-sm text-slate-500">Eliminated vs at risk over recent cycles.</p>
          </div>
          <Badge tone="default" className="bg-slate-100">
            Eliminated {currency.format(data.costEliminated)} · At risk {currency.format(data.costAtRisk)}
          </Badge>
        </div>
        <div className="mt-6 h-56 rounded-[32px] bg-gradient-to-br from-white via-slate-50 to-white p-6">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <linearGradient id="summaryRisk" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="summaryElim" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#summaryRisk)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trendPoints.risk}
            />
            <polyline
              fill="none"
              stroke="url(#summaryElim)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trendPoints.eliminated}
            />
          </svg>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            {trendPoints.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-10 flex justify-end gap-3">
        <Link href="/wall" className={buttonClasses("outline", "sm")}>
          ← Back to Wall
        </Link>
        <BackToDashboardButton variant="primary" label="Close Summary" />
      </div>
    </div>
  );
};

export default SummaryPage;

const MetricCard = ({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: number;
  sub?: string;
  accent: "verified" | "active" | "danger" | "default";
}) => {
  const toneClasses: Record<typeof accent, string> = {
    verified: "bg-emerald-50 text-emerald-700",
    active: "bg-blue-50 text-blue-700",
    danger: "bg-rose-50 text-rose-700",
    default: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className={`rounded-[28px] text-center ${toneClasses[accent]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </Card>
  );
};

const buildTrendLine = (eliminated: number, risk: number) => {
  const labels = ["Week -4", "Week -3", "Week -2", "Week -1", "Now"];
  const steps = labels.length;
  const riskSeries = Array.from({ length: steps }, (_, index) => Math.max(risk - (risk / steps) * index, 0));
  const eliminatedSeries = Array.from({ length: steps }, (_, index) => Math.min((eliminated / steps) * (index + 1), eliminated));
  const maxValue = Math.max(...riskSeries, ...eliminatedSeries, 1);

  const toPoints = (series: number[]) =>
    series
      .map((value, index) => {
        const x = (index / (series.length - 1 || 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

  return {
    labels,
    risk: toPoints(riskSeries),
    eliminated: toPoints(eliminatedSeries),
  };
};
