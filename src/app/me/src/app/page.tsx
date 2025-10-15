"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import QuickAddUDE from "@/components/QuickAddUDE";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { useUdeData } from "@/context/UdeDataContext";
import type { UDE } from "@/types/api";

const KPI_ROUTES = {
  risk: "/wall?filter=defined+active",
  eliminated: "/wall?filter=verified",
  roi: "/analytics",
};

const DashboardPage = () => {
  const router = useRouter();
  const { company, udes, loading } = useUdeData();

  const [fabOpen, setFabOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const metrics = useMemo(() => buildMetrics(udes), [udes]);
  const banner = useMemo(() => buildBannerState(metrics.verifiedCount, metrics.agendaTotal), [metrics]);

  if (loading || !company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-500">
        <p>Loading Bloodwall…</p>
      </div>
    );
  }
  const bannerGradients: Record<"verified" | "active" | "danger", string> = {
    verified: "from-emerald-500 via-emerald-400 to-emerald-600",
    active: "from-amber-400 via-orange-400 to-amber-600",
    danger: "from-rose-500 via-rose-600 to-rose-700",
  };
  const bannerGradient = bannerGradients[banner.tone];

  const handleNavigate = (path: string) => {
    setFabOpen(false);
    router.push(path);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <Image src={company.logoUrl} alt={`${company.name} logo`} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <p className="text-sm text-slate-500">{company.loopStatement ?? "Run the accountability loop with your crew."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={banner.tone}>{banner.label}</Badge>
            <Link href="/setup" className={buttonClasses("outline", "sm", "px-4")}>⚙️ Settings</Link>
          </div>
        </header>

        <Card className={`rounded-[40px] border border-white/30 bg-gradient-to-br ${bannerGradient} p-8 text-white shadow-[0_60px_120px_-60px_rgba(15,23,42,0.9)]`}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">Accountability Loop</span>
              <h2 className="text-3xl font-semibold tracking-tight">{banner.headline}</h2>
              <p className="text-sm text-white/70">{metrics.agendaTotal} updates in-flight · {metrics.verifiedCount} verified</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/me"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/95 px-6 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.9)] transition hover:bg-white"
              >
                Catch up now →
              </Link>
              <Link
                href="/mam"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Enter MAM Mode
              </Link>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard
            title="Cost at Risk"
            value={metrics.costAtRisk}
            description="Defined + Active UDEs"
            tone="danger"
            onClick={() => handleNavigate(KPI_ROUTES.risk)}
          />
          <KpiCard
            title="Cost Eliminated"
            value={metrics.costEliminated}
            description="Verified history"
            tone="verified"
            onClick={() => handleNavigate(KPI_ROUTES.eliminated)}
          />
          <KpiCard
            title="ROI Ratio"
            value={`${metrics.roiRatio}%`}
            description="Eliminated vs At Risk"
            tone="active"
            onClick={() => handleNavigate(KPI_ROUTES.roi)}
          />
        </section>

        <Trendline riskSeries={metrics.riskSeries} eliminatedSeries={metrics.eliminatedSeries} labels={metrics.labels} />
      </div>

      <Fab open={fabOpen} onToggle={() => setFabOpen((prev) => !prev)} onAdd={() => { setQuickAddOpen(true); setFabOpen(false); }} onMam={() => handleNavigate("/mam")} />

      {quickAddOpen && <QuickAddUDE open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />}
    </div>
  );
};

export default DashboardPage;

const Fab = ({ open, onToggle, onAdd, onMam }: { open: boolean; onToggle: () => void; onAdd: () => void; onMam: () => void }) => (
  <div className="fixed bottom-8 right-8 z-50">
    <div className="relative">
      {open && (
        <div className="absolute -top-32 -right-2 flex h-28 w-32 flex-col items-end gap-3">
          <button type="button" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5" onClick={onAdd}>
            + Add UDE
          </button>
          <button type="button" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5" onClick={onMam}>
            Enter MAM Mode
          </button>
        </div>
      )}
      <button type="button" className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl font-semibold text-white shadow-[0_30px_60px_-40px_rgba(15,23,42,0.8)] transition hover:scale-[1.03]" onClick={onToggle} aria-label="Open quick actions">
        {open ? "×" : "+"}
      </button>
    </div>
  </div>
);

const KpiCard = ({ title, value, description, tone, onClick }: { title: string; value: string; description: string; tone: "danger" | "verified" | "active"; onClick: () => void }) => {
  const toneClasses: Record<typeof tone, string> = {
    danger: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white",
    verified: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white",
    active: "bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-white",
  };

  return (
    <button type="button" onClick={onClick} className={`group rounded-[32px] border border-slate-200 p-6 text-left shadow-[0_28px_60px_-48px_rgba(15,23,42,0.4)] transition hover:-translate-y-1 hover:shadow-[0_38px_80px_-50px_rgba(15,23,42,0.5)] ${toneClasses[tone]}`}>
      <span className="text-xs uppercase tracking-wide text-slate-500">{title}</span>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        Navigate
        <span className="text-slate-400 transition group-hover:translate-x-1">→</span>
      </span>
    </button>
  );
};

const Trendline = ({ riskSeries, eliminatedSeries, labels }: { riskSeries: number[]; eliminatedSeries: number[]; labels: string[] }) => {
  const maxValue = Math.max(...riskSeries, ...eliminatedSeries, 1);
  const toPoints = (series: number[]) =>
    series
      .map((value, index) => {
        const x = (index / (series.length - 1 || 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <Card className="rounded-[36px] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Loop Momentum</h2>
          <p className="text-sm text-slate-500">Risk vs Eliminated across recent cycles.</p>
        </div>
        <Badge tone="default" className="bg-slate-100">Last {labels.length} cycles</Badge>
      </div>
      <div className="mt-6 h-56 rounded-[32px] bg-gradient-to-br from-white via-slate-50 to-white p-6">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id="riskGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="elimGradient" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="url(#riskGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={toPoints(riskSeries)} />
          <polyline fill="none" stroke="url(#elimGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={toPoints(eliminatedSeries)} />
        </svg>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </Card>
  );
};

const buildMetrics = (udes: UDE[]) => {
  const costAtRisk = sumByStatus(udes, ["DEFINED", "ACTIVE"]);
  const costEliminated = sumByStatus(udes, ["VERIFIED", "CLOSED"]);
  const agendaTotal = udes.filter((ude) => ude.status === "ACTIVE" || ude.status === "DEFINED").length;
  const verifiedCount = udes.filter((ude) => ude.status === "VERIFIED").length;
  const roiRatio = costAtRisk === 0 ? 0 : Math.round((costEliminated / costAtRisk) * 100);

  const labels = ["-5", "-4", "-3", "-2", "-1", "Now"];
  const riskSeries = buildSeries(costAtRisk, labels.length);
  const eliminatedSeries = buildSeries(costEliminated, labels.length, true);

  return {
    costAtRisk: currency(costAtRisk),
    costEliminated: currency(costEliminated),
    roiRatio,
    agendaTotal,
    verifiedCount,
    labels,
    riskSeries,
    eliminatedSeries,
  };
};

const buildBannerState = (verifiedCount: number, agendaTotal: number) => {
  if (agendaTotal === 0) {
    return { tone: "verified" as const, label: "Loop Clear", headline: "Accountability Improving" };
  }
  const ratio = verifiedCount / agendaTotal;
  if (ratio >= 0.7) {
    return { tone: "verified" as const, label: "Green Loop", headline: "Momentum On Track" };
  }
  if (ratio >= 0.4) {
    return { tone: "active" as const, label: "Yellow Loop", headline: "Tighten the Loop" };
  }
  return { tone: "danger" as const, label: "Red Loop", headline: "Loop Needs Attention" };
};

const sumByStatus = (udes: UDE[], statuses: UDE["status"][]) =>
  udes
    .filter((ude) => statuses.includes(ude.status))
    .reduce((total, ude) => total + ude.costImpact, 0);

const buildSeries = (value: number, steps: number, ascending = false) => {
  if (value === 0) {
    return Array.from({ length: steps }, () => 0);
  }
  const delta = value / steps;
  return Array.from({ length: steps }, (_, index) =>
    ascending ? Math.min(delta * (index + 1), value) : Math.max(value - delta * index, 0),
  );
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
