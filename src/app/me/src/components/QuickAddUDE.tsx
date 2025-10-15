"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Button, { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useUdeData } from "@/context/UdeDataContext";
import type { Category, TeamMember } from "@/types/api";

type QuickAddUDEProps = {
  open: boolean;
  onClose: () => void;
};

type QuickAddForm = {
  title: string;
  metricName: string;
  costImpact: string;
  ownerId: string;
  categoryId: string;
  dueDate: string;
};

const EMPTY_FORM: QuickAddForm = {
  title: "",
  metricName: "",
  costImpact: "",
  ownerId: "",
  categoryId: "",
  dueDate: "",
};

const DEFAULT_CATEGORIES = ["Sales", "Ops", "Finance", "People"];

const QuickAddUDE = ({ open, onClose }: QuickAddUDEProps) => {
  const { company, udes, createUde } = useUdeData();
  const categories: Category[] = useMemo(
    () =>
      company?.categories ??
      DEFAULT_CATEGORIES.map((name, index) => ({ id: -(index + 1), name, companyId: company?.id ?? 0 })),
    [company],
  );
  const owners = useMemo<TeamMember[]>(() => company?.teamMembers ?? [], [company]);
  const [form, setForm] = useState<QuickAddForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = useMemo(() => {
    return (
      !form.title.trim() ||
      !form.metricName.trim() ||
      !form.ownerId ||
      !form.categoryId
    );
  }, [form.title, form.metricName, form.ownerId, form.categoryId]);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = form.title.trim();
    const trimmedMetricName = form.metricName.trim();
    if (!trimmedTitle || !trimmedMetricName || !form.ownerId || !form.categoryId) {
      return;
    }
    setSubmitting(true);
    try {
      await createUde({
        title: trimmedTitle,
        ownerId: Number.parseInt(form.ownerId, 10),
        categoryId: Number.parseInt(form.categoryId, 10),
        costImpact: Number.parseInt(form.costImpact || "0", 10) || 0,
        dueDate: form.dueDate || null,
        metric: {
          name: trimmedMetricName,
          baseline: 0,
          goal: 0,
          current: 0,
          lastWeek: 0,
        },
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-md flex-col">
        <Card className="flex h-full flex-col gap-6 overflow-y-auto rounded-[36px]">
          <header className="sticky top-0 flex items-center justify-between rounded-[28px] bg-white/90 p-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick Add UDE</h2>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total tracked · {udes.length}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 p-4">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Title</span>
              <Input
                required
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Undesirable effect to capture"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Metric to Track</span>
              <Input
                required
                name="metricName"
                value={form.metricName}
                onChange={handleChange}
                placeholder="e.g. AR Days, Scrap Rate"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Owner</span>
              <select
                required
                name="ownerId"
                value={form.ownerId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ownerId: event.target.value }))
                }
                className="w-full rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="" disabled>
                  Select owner
                </option>
                {owners.length === 0 ? (
                  <option value="" disabled>
                    Add team in setup
                  </option>
                ) : (
                  owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="space-y-2 text-sm font-medium text-slate-600">
              <span>Category</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const id = String(category.id);
                  const label = category.name;
                  const isActive = form.categoryId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, categoryId: id }))}
                      className={buttonClasses(isActive ? "primary" : "outline", "sm", "px-4")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-600">
                <span>Cost Impact ($)</span>
                <Input
                  name="costImpact"
                  value={form.costImpact}
                  onChange={handleChange}
                  placeholder="Estimated annual impact"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-600">
                <span>Due Date</span>
                <Input name="dueDate" value={form.dueDate} onChange={handleChange} type="date" />
              </label>
            </div>

            <div className="mt-auto flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isDisabled || submitting}>
                {submitting ? "Saving…" : "Save UDE"}
              </Button>
            </div>
          </form>
        </Card>
      </aside>
    </div>
  );
};

export default QuickAddUDE;
