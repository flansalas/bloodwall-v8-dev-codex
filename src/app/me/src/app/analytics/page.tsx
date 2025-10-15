"use client";

import { useMemo } from "react";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import Card from "@/components/ui/Card";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import { useUdeData } from "@/context/UdeDataContext";

const CATEGORY_LABELS = ["Sales", "Ops", "Finance"] as const;
const STATUS_LABELS = ["DEFINED", "ACTIVE", "VERIFIED", "CLOSED"] as const;

type CategoryKey = (typeof CATEGORY_LABELS)[number];
type StatusKey = (typeof STATUS_LABELS)[number];

const statusTone: Record<StatusKey, BadgeTone> = {
  DEFINED: "default",
  ACTIVE: "active",
  VERIFIED: "verified",
  CLOSED: "closed",
};

const AnalyticsPage = () => {
  const { udes, loading } = useUdeData();

  const categoryCounts = useMemo(() => {
    const base = CATEGORY_LABELS.reduce(
      (acc, label) => {
        acc[label] = 0;
        return acc;
      },
      {} as Record<CategoryKey, number>,
    );

    udes.forEach((ude) => {
      const name = (ude.category?.name ?? "").trim();
      if (!name) return;
      const match = CATEGORY_LABELS.find(
        (label) => label.toLowerCase() === name.toLowerCase(),
      );
      if (match) {
        base[match] += 1;
      }
    });

    return base;
  }, [udes]);

  const statusCounts = useMemo(() => {
    const base = STATUS_LABELS.reduce(
      (acc, label) => {
        acc[label] = 0;
        return acc;
      },
      {} as Record<StatusKey, number>,
    );

    udes.forEach((ude) => {
      if (STATUS_LABELS.includes(ude.status as StatusKey)) {
        base[ude.status as StatusKey] += 1;
      }
    });

    return base;
  }, [udes]);

  const metricRows = useMemo(() => {
    return udes
      .filter((ude) => ude.metrics.length > 0)
      .map((ude) => {
        const [metric] = ude.metrics;
        return {
          id: ude.id,
          title: ude.title,
          category: ude.category?.name ?? "Uncategorized",
          status: ude.status as StatusKey,
          metric,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [udes]);

  const deltaFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    [],
  );

  return (
    <div className="space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Analytics
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Flow Scoreboard v1
          </h1>
          <p className="text-sm text-slate-500">
            Lightweight snapshot of category mix, status flow, and tracked
            metrics.
          </p>
        </div>
        <BackToDashboardButton label="Dashboard" className="border-slate-200 bg-white" />
      </header>

      {loading ? (
        <Card className="text-sm text-slate-500">
          Loading scoreboard...
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  UDEs by category
                </h2>
                <p className="text-sm text-slate-500">
                  Sales, Ops, and Finance rollup.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {CATEGORY_LABELS.map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-700"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {categoryCounts[label]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  UDEs by status
                </h2>
                <p className="text-sm text-slate-500">
                  Canonical flow from defined to closed.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_LABELS.map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {status}
                  </span>
                  <span className="text-xl font-semibold text-slate-900">
                    {statusCounts[status]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  UDEs with metrics
                </h2>
                <p className="text-sm text-slate-500">
                  Baseline to goal tracking with current delta.
                </p>
              </div>
              <Badge tone="default">
                {metricRows.length} tracked
              </Badge>
            </div>
            <table className="mt-6 w-full table-fixed text-left text-sm text-slate-600">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Metric</th>
                  <th className="pb-2 text-right">Delta Current vs. Baseline</th>
                </tr>
              </thead>
              <tbody>
                {metricRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-sm text-slate-400"
                    >
                      No metrics linked yet.
                    </td>
                  </tr>
                ) : (
                  metricRows.map((row) => {
                    const delta = row.metric.current - row.metric.baseline;
                    const formattedDelta = `${delta >= 0 ? "+" : ""}${deltaFormatter.format(delta)}`;

                    return (
                      <tr
                        key={row.id}
                        className="border-t border-slate-200"
                      >
                        <td className="py-3 font-medium text-slate-800">
                          {row.title}
                        </td>
                        <td>{row.category}</td>
                        <td>
                          <Badge tone={statusTone[row.status]}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap text-slate-700">
                          {row.metric.baseline.toLocaleString()}
                          <span
                            aria-hidden="true"
                            className="px-1 text-slate-400"
                          >
                            {"\u2192"}
                          </span>
                          {row.metric.current.toLocaleString()}
                          <span
                            aria-hidden="true"
                            className="px-1 text-slate-400"
                          >
                            {"\u2192"}
                          </span>
                          {row.metric.goal.toLocaleString()}
                        </td>
                        <td className="text-right font-semibold text-slate-800">
                          {formattedDelta}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
