"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import Button, { buttonClasses } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useUDEs, type SetupPayload } from "@/lib/udeClientStore";

const STEPS = [
  "Company",
  "Categories",
  "Team",
  "Rhythm",
  "Defaults",
  "Add-ons",
  "Review",
] as const;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const CADENCES = ["Weekly", "Bi-Weekly", "Monthly"];

const SetupPage = () => {
  const router = useRouter();
  const company = useUDEs((state) => state.company);
  const completeSetup = useUDEs((state) => state.completeSetup);

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newMember, setNewMember] = useState("");

  const [form, setForm] = useState<SetupPayload>({
    name: company.name,
    logoUrl: company.logoUrl,
    loopStatement: company.loopStatement,
    categories: company.categories,
    team: company.team,
    rhythm: { ...company.rhythm },
    defaults: { ...company.defaults },
    addOns: { ...company.addOns },
  });

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const canAdvance = useMemo(() => {
    switch (STEPS[stepIndex]) {
      case "Company":
        return form.name.trim().length > 0 && form.loopStatement.trim().length > 0;
      case "Categories":
        return form.categories.length > 0;
      case "Team":
        return form.team.length > 0;
      case "Rhythm":
        return Boolean(form.rhythm.day) && Boolean(form.rhythm.time);
      case "Defaults":
        return form.defaults.currency.trim().length > 0;
      case "Add-ons":
        return true;
      case "Review":
        return true;
      default:
        return true;
    }
  }, [stepIndex, form]);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canAdvance || loading) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    setLoading(true);
    completeSetup(form);
    setTimeout(() => {
      router.push("/");
    }, 300);
  };

  const handleBack = () => {
    if (stepIndex === 0 || loading) return;
    setStepIndex((prev) => prev - 1);
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || form.categories.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, categories: [...prev.categories, trimmed] }));
    setNewCategory("");
  };

  const removeCategory = (value: string) => {
    setForm((prev) => ({ ...prev, categories: prev.categories.filter((cat) => cat !== value) }));
  };

  const addTeamMember = () => {
    const trimmed = newMember.trim();
    if (!trimmed || form.team.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, team: [...prev.team, trimmed] }));
    setNewMember("");
  };

  const removeMember = (value: string) => {
    setForm((prev) => ({ ...prev, team: prev.team.filter((member) => member !== value) }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-16 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <div className="w-full">
          <div className="flex justify-end">
            <BackToDashboardButton className="ml-auto" />
          </div>
        </div>
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Setup Wizard</p>
          <h1 className="text-3xl font-semibold tracking-tight">Launch your Bloodwall loop</h1>
          <p className="text-sm text-slate-500">
            Capture the essentials once and the dashboard, wall, and MAM Mode stay in sync.
          </p>
        </header>

        <div className="flex items-center gap-2">
          {STEPS.map((_, index) => {
            const active = index === stepIndex;
            const complete = index < stepIndex;
            return (
              <span
                key={index}
                className={`h-2.5 w-8 rounded-full transition ${
                  active
                    ? "bg-slate-900"
                    : complete
                      ? "bg-slate-400"
                      : "bg-slate-200"
                }`}
              />
            );
          })}
        </div>

        <div className="h-1 w-32 rounded-full bg-slate-200">
          <div className="h-1 rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-8">
          <Card className="mx-auto max-w-2xl rounded-[40px] border border-white/40 bg-white/85 p-10 shadow-[0_36px_120px_-96px_rgba(15,23,42,0.9)] backdrop-blur">
            {renderStep({
              step: STEPS[stepIndex],
              form,
              setForm,
              newCategory,
              setNewCategory,
              newMember,
              setNewMember,
              addCategory,
              removeCategory,
              addTeamMember,
              removeMember,
            })}
          </Card>

          <div className="mx-auto flex w-full max-w-2xl justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={handleBack} disabled={stepIndex === 0 || loading}>
              ← Back
            </Button>
            <Button type="submit" size="sm" disabled={!canAdvance || loading}>
              {stepIndex === STEPS.length - 1 ? (loading ? "Launching…" : "Launch Dashboard") : "Next"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupPage;

type StepRendererParams = {
  step: (typeof STEPS)[number];
  form: SetupPayload;
  setForm: (updater: (prev: SetupPayload) => SetupPayload) => void;
  newCategory: string;
  setNewCategory: (value: string) => void;
  newMember: string;
  setNewMember: (value: string) => void;
  addCategory: () => void;
  removeCategory: (value: string) => void;
  addTeamMember: () => void;
  removeMember: (value: string) => void;
};

const renderStep = ({
  step,
  form,
  setForm,
  newCategory,
  setNewCategory,
  newMember,
  setNewMember,
  addCategory,
  removeCategory,
  addTeamMember,
  removeMember,
}: StepRendererParams) => {
  switch (step) {
    case "Company":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Tell us about your company</h2>
          <div className="grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Company name</span>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Bloodwall Labs" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Logo URL</span>
              <Input
                value={form.logoUrl ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                placeholder="https://yourcdn/logo.png"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Loop statement</span>
              <Input
                value={form.loopStatement}
                onChange={(event) => setForm((prev) => ({ ...prev, loopStatement: event.target.value }))}
                placeholder="What should this loop reinforce?"
              />
            </label>
          </div>
        </div>
      );
    case "Categories":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Loop categories</h2>
          <p className="text-sm text-slate-500">Organize UDEs into a few focused lanes.</p>
          <div className="flex flex-wrap gap-3">
            {form.categories.map((category) => (
              <span key={category} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow">
                {category}
                <button type="button" onClick={() => removeCategory(category)} className="text-white/60 hover:text-white">
                  ×
                </button>
              </span>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Add category"
                className="w-40"
              />
              <Button type="button" size="sm" onClick={addCategory} disabled={!newCategory.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      );
    case "Team":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Who owns this loop?</h2>
          <div className="flex flex-wrap gap-3">
            {form.team.map((member) => (
              <span key={member} className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
                {member}
                <button type="button" onClick={() => removeMember(member)} className="text-slate-400 hover:text-slate-600">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Input value={newMember} onChange={(event) => setNewMember(event.target.value)} placeholder="Add teammate" className="w-48" />
            <Button type="button" size="sm" onClick={addTeamMember} disabled={!newMember.trim()}>
              Add teammate
            </Button>
          </div>
          <p className="text-xs text-slate-400">We’ll use this list when assigning UDEs and actions.</p>
        </div>
      );
    case "Rhythm":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Set your accountability rhythm</h2>
          <div className="flex flex-wrap gap-3">
            {CADENCES.map((cadence) => (
              <button
                key={cadence}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, rhythm: { ...prev.rhythm, cadence } }))}
                className={buttonClasses(
                  form.rhythm.cadence === cadence ? "primary" : "outline",
                  "sm",
                  "px-4"
                )}
              >
                {cadence}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm font-medium text-slate-600">
              <span>Day</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, rhythm: { ...prev.rhythm, day } }))}
                    className={buttonClasses(form.rhythm.day === day ? "primary" : "outline", "sm", "px-4")}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Start time</span>
              <Input
                type="time"
                value={form.rhythm.time}
                onChange={(event) => setForm((prev) => ({ ...prev, rhythm: { ...prev.rhythm, time: event.target.value } }))}
                className="w-40"
              />
            </label>
          </div>
        </div>
      );
    case "Defaults":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Baseline defaults</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Currency</span>
              <Input
                value={form.defaults.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, defaults: { ...prev.defaults, currency: event.target.value.toUpperCase() } }))}
                placeholder="USD"
                className="w-32"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-600">
              <span>Review window</span>
              <Input
                value={form.defaults.reviewWindow}
                onChange={(event) => setForm((prev) => ({ ...prev, defaults: { ...prev.defaults, reviewWindow: event.target.value } }))}
                placeholder="Weekly"
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">Defaults guide new UDE entries and reporting language.</p>
        </div>
      );
    case "Add-ons":
      return (
        <div className="space-y-6 text-left">
          <h2 className="text-lg font-semibold text-slate-900">Enhance with AI coach</h2>
          <Card className="rounded-[28px] border border-slate-200 bg-white/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">AI UDE Coach</p>
                <p className="text-xs text-slate-500">Suggests metrics, follow-ups, and flags stalled loops automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, addOns: { ...prev.addOns, aiCoach: !prev.addOns.aiCoach } }))}
                className={buttonClasses(form.addOns.aiCoach ? "primary" : "outline", "sm", "px-5")}
              >
                {form.addOns.aiCoach ? "Enabled" : "Enable"}
              </button>
            </div>
          </Card>
          <p className="text-xs text-slate-400">You can toggle add-ons anytime from settings.</p>
        </div>
      );
    case "Review":
      return (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Review &amp; Launch</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewTile label="Company" value={form.name} />
            <ReviewTile label="Logo" value={form.logoUrl ?? "Not set"} />
            <ReviewTile label="Loop statement" value={form.loopStatement} />
            <ReviewTile label="Categories" value={form.categories.join(", ")} />
            <ReviewTile label="Team" value={form.team.join(", ")} />
            <ReviewTile label="Rhythm" value={`${form.rhythm.cadence} · ${form.rhythm.day} · ${form.rhythm.time}`} />
            <ReviewTile label="Defaults" value={`${form.defaults.currency} · ${form.defaults.reviewWindow}`} />
            <ReviewTile label="AI Coach" value={form.addOns.aiCoach ? "Enabled" : "Disabled"} />
          </div>
          <p className="text-sm text-slate-500">Hit launch to update the dashboard, wall, and MAM experience with your branding.</p>
        </div>
      );
    default:
      return null;
  }
};

const ReviewTile = ({ label, value }: { label: string; value: string }) => (
  <Card className="rounded-[24px] border border-slate-200 bg-white/60 p-5">
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-medium text-slate-800">{value || "—"}</p>
  </Card>
);
