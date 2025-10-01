"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { useUDEs, type CreateUDEInput } from "../lib/udeStore";

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

const QuickAddUDE = ({ open, onClose }: QuickAddUDEProps) => {
  const totalUDEs = useUDEs((state) => state.udes.length);
  const addUDE = useUDEs((state) => state.addUDE);
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
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="flex h-full w-full max-w-md flex-col">
        <Card className="flex h-full flex-col gap-6 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Quick Add UDE</h2>
            <p className="text-sm text-gray-500">Total UDEs tracked: {totalUDEs}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Title
            <input
              required
              name="title"
              value={form.title}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Describe the undesirable effect"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Metric to Track
            <input
              required
              name="metricName"
              value={form.metricName}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. AR Days, Close Rate %, Scrap Rate, Safety Incidents"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Owner
            <input
              required
              name="owner"
              value={form.owner}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Who is accountable?"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Category
            <input
              required
              name="category"
              value={form.category}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. People, Finance"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Cost Impact ($)
            <input
              name="costImpact"
              value={form.costImpact}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Estimated cost impact"
              type="number"
              min="0"
              step="0.01"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Due Date
            <input
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none"
              type="date"
            />
          </label>

          <div className="mt-auto flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isDisabled}>
              Save
            </Button>
          </div>
        </form>
        </Card>
      </aside>
    </div>
  );
};

export default QuickAddUDE;
