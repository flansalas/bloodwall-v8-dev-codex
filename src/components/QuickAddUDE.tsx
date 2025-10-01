"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Button, { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useUDEs, type CreateUDEInput } from "@/lib/udeStore";

type QuickAddUDEProps = {
  open: boolean;
  onClose: () => void;
};

const EMPTY_FORM = {
  title: "",
  metricName: "",
  costImpact: "",
  owner: "",
  category: "",
  dueDate: "",
};

const DEFAULT_CATEGORIES = ["Sales", "Ops", "Finance", "People"];

const QuickAddUDE = ({ open, onClose }: QuickAddUDEProps) => {
  const totalUDEs = useUDEs((state) => state.udes.length);
  const addUDE = useUDEs((state) => state.addUDE);
  const companyCategories = useUDEs((state) => state.company.categories);
  const companyTeam = useUDEs((state) => state.company.team);
  const categories = useMemo(() => (companyCategories.length > 0 ? companyCategories : DEFAULT_CATEGORIES), [companyCategories]);
  const owners = useMemo(() => (companyTeam.length > 0 ? companyTeam : ["Owner"]), [companyTeam]);
  const [form, setForm] = useState(EMPTY_FORM);

  const isDisabled = useMemo(() => {
    return (
      !form.title.trim() ||
      !form.metricName.trim() ||
      !form.owner.trim() ||
      !form.category.trim()
    );
  }, [form.title, form.metricName, form.owner, form.category]);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = form.title.trim();
    const trimmedMetricName = form.metricName.trim();
    const trimmedOwner = form.owner.trim();
    const trimmedCategory = form.category.trim();

    if (!trimmedTitle || !trimmedMetricName || !trimmedOwner || !trimmedCategory) {
      return;
    }

    const newUDE: CreateUDEInput = {
      title: trimmedTitle,
      owner: trimmedOwner,
      category: trimmedCategory,
      costImpact: Number.parseFloat(form.costImpact) || 0,
      dueDate: form.dueDate || undefined,
      metricName: trimmedMetricName,
      baseline: 0,
      goal: 0,
      current: 0,
      lastWeek: 0,
    };

    addUDE(newUDE);
    resetForm();
    onClose();
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
              <p className="text-xs uppercase tracking-wide text-slate-400">Total tracked · {totalUDEs}</p>
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
                  name="owner"
                  value={form.owner}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, owner: event.target.value }))
                  }
                  className="w-full rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Select owner
                  </option>
                  {owners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-2 text-sm font-medium text-slate-600">
                <span>Category</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isActive = form.category === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, category }))}
                        className={buttonClasses(isActive ? "primary" : "outline", "sm", "px-4")}
                      >
                        {category}
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
              <Button type="submit" className="flex-1" disabled={isDisabled}>
                Save UDE
              </Button>
            </div>
          </form>
        </Card>
      </aside>
    </div>
  );
};

export default QuickAddUDE;
