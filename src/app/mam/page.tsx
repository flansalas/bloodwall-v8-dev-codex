"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import UDEDetailCard from "@/components/UDEDetailCard";
import { useUDEs, type UDE } from "@/lib/udeStore";

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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type DecisionOutcome = {
  id: string;
  decision: "verify" | "keep-active" | "needs-work";
  status: UDE["status"];
};

const ownerInitial = (owner: string) => owner.trim().charAt(0).toUpperCase() || "?";

const MamModePage = () => {
  const udes = useUDEs((state) => state.udes);
  const getDueThisWeek = useUDEs((state) => state.getDueThisWeek);
  const addLog = useUDEs((state) => state.addLog);

  const agenda = useMemo(() => {
    const due = getDueThisWeek();
    if (due.length > 0) return due;
    return udes
      .filter((ude) => ude.status === "Active")
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  }, [getDueThisWeek, udes]);

  const [selectedId, setSelectedId] = useState<string | null>(agenda[0]?.id ?? null);
  const [decisions, setDecisions] = useState<Record<string, DecisionOutcome>>({});
  const [summaryLogged, setSummaryLogged] = useState(false);

  useEffect(() => {
    if (agenda.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && agenda.some((ude) => ude.id === selectedId)) return;
    const next = agenda.find((ude) => !decisions[ude.id]) ?? agenda[0];
    setSelectedId(next?.id ?? null);
  }, [agenda, decisions, selectedId]);

  const totalAgenda = agenda.length;
  const reviewedCount = Object.keys(decisions).length;
  const progressLabel = totalAgenda ? `${Math.min(reviewedCount, totalAgenda)} of ${totalAgenda} reviewed` : "No agenda";

  const selectedUde = useMemo(() => agenda.find((ude) => ude.id === selectedId) ?? null, [agenda, selectedId]);

  const handleDecision = (decision: "verify" | "keep-active" | "needs-work", status: UDE["status"]) => {
    if (!selectedUde) return;
    setDecisions((prev) => {
      const next = { ...prev, [selectedUde.id]: { id: selectedUde.id, decision, status } };
      const remaining = agenda.find((ude) => !next[ude.id]);
      setSelectedId(remaining?.id ?? null);
      return next;
    });
  };

  const showSummary = totalAgenda > 0 && reviewedCount >= totalAgenda;

  const verifiedCount = Object.values(decisions).filter((item) => item.decision === "verify").length;
  const needsWorkCount = Object.values(decisions).filter((item) => item.decision === "needs-work").length;
  const keepActiveCount = Object.values(decisions).filter((item) => item.decision === "keep-active").length;
  const newCount = udes.filter((ude) => ude.status === "Defined").length;

  const costEliminated = udes.filter((ude) => ude.status === "Verified").reduce((acc, ude) => acc + ude.costImpact, 0);
  const costAtRisk = udes.filter((ude) => ude.status === "Defined" || ude.status === "Active").reduce((acc, ude) => acc + ude.costImpact, 0);

  const statusBanner = useMemo(() => {
    if (verifiedCount > needsWorkCount) {
      return {
        label: "Accountability Improving",
        gradient: "from-emerald-500 via-blue-500 to-sky-500",
        sub: "More wins than risks this cycle.",
      };
    }
    if (verifiedCount === needsWorkCount) {
      return {
        label: "Signal Weak",
        gradient: "from-amber-400 via-orange-400 to-rose-400",
        sub: "Momentum is flat. Rally the team next week.",
      };
    }
    return {
      label: "Accountability At Risk",
      gradient: "from-rose-500 via-rose-600 to-red-500",
      sub: "More issues than wins. Unblock the loop.",
    };
  }, [verifiedCount, needsWorkCount]);

  const verifiedByOwner = useMemo(() => {
    const tally: Record<string, number> = {};
    Object.values(decisions).forEach((outcome) => {
      if (outcome.decision !== "verify") return;
      const match = udes.find((ude) => ude.id === outcome.id);
      if (!match) return;
      tally[match.owner] = (tally[match.owner] ?? 0) + 1;
    });
    return tally;
  }, [decisions, udes]);

  const actionStats = useMemo(() =>
    udes.reduce(
      (acc, ude) => {
        ude.actions.forEach((action) => {
          if (action.status === "Done") acc.done += 1;
          else acc.outstanding += 1;
        });
        return acc;
      },
      { done: 0, outstanding: 0 },
    ),
  [udes]);

  const totalActionsReviewed = actionStats.done + actionStats.outstanding;
  const actionCompletionPct = totalActionsReviewed === 0 ? 0 : Math.round((actionStats.done / totalActionsReviewed) * 100);

  useEffect(() => {
    if (!showSummary || summaryLogged) return;
    Object.values(decisions).forEach((outcome) => {
      if (outcome.decision === "keep-active") {
        addLog(outcome.id, "Reviewed during MAM – remains active");
      }
    });
    setSummaryLogged(true);
  }, [showSummary, summaryLogged, decisions, addLog]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">MAM Mode</p>
          <h1 className="text-2xl font-semibold text-slate-900">Weekly Accountability Review</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="active" className="text-sm font-semibold">
            {progressLabel}
          </Badge>
          <Link href="/" className={buttonClasses("outline", "sm")}>Dashboard</Link>
        </div>
      </Card>

      {showSummary ? (
        <Card className="space-y-8 rounded-[32px] p-8">
          <div className={`rounded-full bg-gradient-to-r ${statusBanner.gradient} px-8 py-6 text-white shadow-lg`}>
            <h2 className="text-2xl font-semibold">{statusBanner.label}</h2>
            <p className="text-sm text-white/80">{statusBanner.sub}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile tone="blue" label="Verified" value={verifiedCount} />
            <SummaryTile tone="amber" label="Kept Active" value={keepActiveCount} />
            <SummaryTile tone="rose" label="Needs Work" value={needsWorkCount} />
            <SummaryTile tone="slate" label="New UDEs" value={newCount} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4 rounded-[28px] border border-slate-200">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team Breakdown</h3>
              {Object.keys(verifiedByOwner).length === 0 ? (
                <p className="text-sm text-slate-500">No verified wins recorded this session.</p>
              ) : (
                <table className="w-full table-fixed text-left text-sm text-slate-600">
                  <tbody>
                    {Object.entries(verifiedByOwner).map(([owner, count]) => (
                      <tr key={owner} className="border-t border-slate-200">
                        <td className="py-3 font-medium text-slate-800">{owner}</td>
                        <td>
                          <Badge tone="verified">{count} closed</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card className="space-y-4 rounded-[28px] border border-slate-200">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Actions Summary</h3>
              <p className="text-sm text-slate-600">
                {actionStats.done} completed • {actionStats.outstanding} outstanding ({actionCompletionPct}% complete)
              </p>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${actionCompletionPct}%` }} />
              </div>
              <p className="text-xs text-slate-400">{totalActionsReviewed} total actions reviewed.</p>
            </Card>
          </div>

          <Card className="space-y-3 rounded-[28px] border border-slate-200">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trendline</h3>
            <p className="text-sm text-slate-600">
              Cost eliminated {formatCurrency(costEliminated)} vs {formatCurrency(costAtRisk)} remaining risk.
            </p>
            <div className="h-32 rounded-[24px] bg-gradient-to-r from-slate-100 via-white to-slate-100" />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="default" className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
              Eliminated {formatCurrency(costEliminated)} • At Risk {formatCurrency(costAtRisk)}
            </Badge>
            <Link href="/" className={buttonClasses("primary", "sm")}>Return to Dashboard</Link>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-80">
            <Card className="rounded-[32px] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</h2>
              {agenda.length === 0 ? (
                <div className="rounded-[22px] bg-slate-100 px-4 py-6 text-sm text-slate-500">No active UDEs to review.</div>
              ) : (
                <ul className="space-y-3">
                  {agenda.map((ude) => {
                    const isActive = selectedId === ude.id;
                    const decision = decisions[ude.id];
                    return (
                      <li key={ude.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(ude.id)}
                          className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition ${
                            isActive ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              isActive ? "bg-white/20" : "bg-white"
                            } text-xs font-semibold ${isActive ? "text-white" : "text-slate-600"}`}>
                              {ownerInitial(ude.owner)}
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium">{ude.title}</p>
                              <p className="text-[11px] uppercase tracking-wide opacity-70">{ude.metricName}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs opacity-70">
                            <div>{formatCurrency(ude.costImpact)}</div>
                            <div>Due {formatDate(ude.dueDate)}</div>
                          </div>
                        </button>
                        {decision && (
                          <p className="mt-1 text-xs text-slate-500">
                            {decision.decision === "verify"
                              ? "Verified"
                              : decision.decision === "keep-active"
                                ? "Kept Active"
                                : "Needs Work"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>

          <main className="flex-1">
            <Card className="rounded-[32px] p-6">
              {selectedUde ? (
                <UDEDetailCard udeId={selectedUde.id} showDecisionFooter onDecision={handleDecision} lockTargets disableEditing={false} />
              ) : (
                <div className="rounded-[24px] bg-slate-100 px-6 py-12 text-center text-sm text-slate-500">
                  Select a UDE from the agenda to review.
                </div>
              )}
            </Card>
          </main>
        </div>
      )}
    </div>
  );
};

export default MamModePage;

const SummaryTile = ({ tone, label, value }: { tone: "blue" | "amber" | "rose" | "slate"; label: string; value: number }) => {
  const toneClasses: Record<typeof tone, string> = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  } as Record<typeof tone, string>;

  return (
    <div className={`rounded-2xl px-5 py-4 text-center ${toneClasses[tone]}`}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
};
