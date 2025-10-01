"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import Button, { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useUDEs } from "@/lib/udeStore";
import { loadSeedData } from "@/lib/seed";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const AnalyticsPage = () => {
  const udes = useUDEs((state) => state.udes);
  const company = useUDEs((state) => state.company);

  useEffect(() => {
    loadSeedData();
  }, []);

  const { costAtRisk, costEliminated, roiRatio, byCategory } = useMemo(() => {
    const costAtRisk = udes
      .filter((ude) => ude.status === "Defined" || ude.status === "Active")
      .reduce((acc, ude) => acc + ude.costImpact, 0);
    const costEliminated = udes
      .filter((ude) => ude.status === "Verified" || ude.status === "Closed")
      .reduce((acc, ude) => acc + ude.costImpact, 0);
    const roiRatio = costAtRisk === 0 ? (costEliminated > 0 ? 100 : 0) : Number(((costEliminated / costAtRisk) * 100).toFixed(1));

    const byCategory = udes.reduce<Record<string, { risk: number; eliminated: number; count: number }>>((acc, ude) => {
      const bucket = acc[ude.category] ?? { risk: 0, eliminated: 0, count: 0 };
      if (ude.status === "Defined" || ude.status === "Active") bucket.risk += ude.costImpact;
      if (ude.status === "Verified" || ude.status === "Closed") bucket.eliminated += ude.costImpact;
      bucket.count += 1;
      acc[ude.category] = bucket;
      return acc;
    }, {});

    return { costAtRisk, costEliminated, roiRatio, byCategory };
  }, [udes]);

  const trend = buildTrend(costEliminated, costAtRisk);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Analytics</p>
          <h1 className="text-3xl font-semibold tracking-tight">ROI intelligence</h1>
          <p className="text-sm text-slate-500">{company.loopStatement}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className={buttonClasses("outline", "sm")}>Dashboard</Link>
          <Link href="/wall" className={buttonClasses("primary", "sm")}>
            Wall
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Cost at Risk" value={currency.format(costAtRisk)} tone="danger" />
        <MetricCard title="Cost Eliminated" value={currency.format(costEliminated)} tone="verified" />
        <MetricCard title="ROI Ratio" value={`${roiRatio}%`} tone="active" />
      </div>

      <Card className="mt-8 rounded-[36px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Category breakdown</h2>
            <p className="text-sm text-slate-500">Compare risk vs eliminated by lane.</p>
          </div>
          <Badge tone="default" className="bg-slate-100">
            {Object.keys(byCategory).length} categories
          </Badge>
        </div>
        <table className="mt-6 w-full table-fixed text-left text-sm text-slate-600">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2">Category</th>
              <th className="pb-2">Risk</th>
              <th className="pb-2">Eliminated</th>
              <th className="pb-2"># UDEs</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCategory).map(([category, stats]) => (
              <tr key={category} className="border-t border-slate-200">
                <td className="py-3 font-medium text-slate-800">{category}</td>
                <td>{currency.format(stats.risk)}</td>
                <td>{currency.format(stats.eliminated)}</td>
                <td>{stats.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-8 rounded-[36px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Loop trendline</h2>
            <p className="text-sm text-slate-500">Six-cycle view of risk vs eliminated.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Back to top
          </Button>
        </div>
        <div className="mt-6 h-56 rounded-[32px] bg-gradient-to-br from-white via-slate-50 to-white p-6">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <linearGradient id="analyticsRisk" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#f97066" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="analyticsElim" x1="0" x2="1" y1="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#analyticsRisk)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trend.risk}
            />
            <polyline
              fill="none"
              stroke="url(#analyticsElim)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trend.eliminated}
            />
          </svg>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            {trend.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;

const MetricCard = ({ title, value, tone }: { title: string; value: string; tone: "danger" | "verified" | "active" }) => {
  const toneClasses: Record<typeof tone, string> = {
    danger: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white",
    verified: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white",
    active: "bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-white",
  };

  return (
    <Card className={`rounded-[32px] p-6 ${toneClasses[tone]}`}>
      <span className="text-xs uppercase tracking-wide text-slate-500">{title}</span>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
};

const buildTrend = (eliminated: number, risk: number) => {
  const labels = ["-5", "-4", "-3", "-2", "-1", "Now"];
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
