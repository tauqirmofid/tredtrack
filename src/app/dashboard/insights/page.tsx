"use client";

import { useEffect, useState } from "react";
import { Brain, Loader2, Sparkles, Target, TrendingDown } from "lucide-react";

type InsightResponse = {
  profile: { name: string; weightKg: number | null };
  metrics: {
    windowDays: number;
    weeklyRunMinutes: number;
    weeklyStrengthMinutes: number;
    weeklyCaloriesBurned: number;
    runSessionsPerWeek: number;
    strengthSessionsPerWeek: number;
    strengthVolumeKgPerWeek: number;
    weightLossRateKgPerWeek: number;
    etaWeeksForTargetLoss: number | null;
  };
  targets: {
    weeklyRunMinutes: number;
    weeklyStrengthSessions: number;
    suggestedExtraRunSessions: number;
    suggestedExtraStrengthSessions: number;
  };
  microPlan?: {
    today: string;
    tomorrow: string;
    cardio: {
      minutes: number;
      distanceKm: number;
      guidance: string;
    };
    strength: {
      equipment: "dumbbell" | "barbell";
      exercise: string;
      sets: number;
      reps: number;
      weightKg: number;
      durationMinutes: number;
    };
    recovery: {
      hydrationLiters: number;
      sleepHours: string;
    };
  };
  summary: string;
  recommendations: string[];
};

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function safeJson<T>(res: Response, fallback: T): Promise<T> {
    if (!res.ok) return fallback;
    try {
      return await res.json() as T;
    } catch {
      return fallback;
    }
  }

  async function load() {
    const [profileRes, insightRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/insights"),
    ]);
    const profile = await safeJson(profileRes, { weightKg: null });
    const data = await safeJson<InsightResponse | null>(insightRes, null);
    if (!data) {
      setInsight({
        profile: { name: "Athlete", weightKg: profile.weightKg },
        metrics: {
          windowDays: 42,
          weeklyRunMinutes: 0,
          weeklyStrengthMinutes: 0,
          weeklyCaloriesBurned: 0,
          runSessionsPerWeek: 0,
          strengthSessionsPerWeek: 0,
          strengthVolumeKgPerWeek: 0,
          weightLossRateKgPerWeek: 0,
          etaWeeksForTargetLoss: null,
        },
        targets: {
          weeklyRunMinutes: 180,
          weeklyStrengthSessions: 3,
          suggestedExtraRunSessions: 3,
          suggestedExtraStrengthSessions: 2,
        },
        microPlan: {
          today: "Today",
          tomorrow: "Tomorrow",
          cardio: { minutes: 25, distanceKm: 2.5, guidance: "Easy run or brisk walk" },
          strength: { equipment: "dumbbell", exercise: "Dumbbell Bench Press", sets: 3, reps: 10, weightKg: 0, durationMinutes: 20 },
          recovery: { hydrationLiters: 2.4, sleepHours: "7.5-9" },
        },
        summary: "Unable to load insights right now. Try again shortly.",
        recommendations: ["Keep training consistently while insights sync."],
      });
      setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
      setLoading(false);
      return;
    }
    setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
    setInsight(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveWeight() {
    if (!weightKg) return;
    setStatus(null);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: Number(weightKg) }),
    });
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res, {});
      setStatus({ kind: "error", text: data.error ?? "Could not save weight." });
      setSaving(false);
      return;
    }
    setStatus({ kind: "success", text: "Weight saved." });
    await load();
    setSaving(false);
  }

  if (loading || !insight) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-4">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f7" }}>AI Insights</h1>
      <p className="text-sm mb-6" style={{ color: "#8e8e93" }}>Smart plan based on your running + strength performance.</p>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Your Weight</p>
        <div className="flex gap-2">
          <input className="input-field" type="number" min={1} step="0.1" value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)} placeholder="Enter body weight (kg)" />
          <button className="btn-primary w-auto px-4" onClick={saveWeight} disabled={saving || !weightKg}>
            {saving ? "..." : "Save"}
          </button>
        </div>
        {status && (
          <p className="text-xs mt-2" style={{ color: status.kind === "error" ? "#ff453a" : "#30d158" }}>{status.text}</p>
        )}
      </div>

      <div className="card p-5 mb-4" style={{ background: "linear-gradient(135deg, #142a1f, #101924)", border: "1px solid rgba(48,209,88,0.25)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(48,209,88,0.2)", color: "#30d158" }}>
            <Brain size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#f5f5f7" }}>Personal forecast</p>
            <p className="text-sm" style={{ color: "#c7c7cc" }}>{insight.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard icon={<TrendingDown size={16} />} label="Fat-loss pace" value={`${insight.metrics.weightLossRateKgPerWeek} kg/wk`} />
        <MetricCard icon={<Target size={16} />} label="5kg target ETA" value={insight.metrics.etaWeeksForTargetLoss ? `${insight.metrics.etaWeeksForTargetLoss} weeks` : "Build consistency first"} />
        <MetricCard icon={<Sparkles size={16} />} label="Run mins / week" value={`${insight.metrics.weeklyRunMinutes} / ${insight.targets.weeklyRunMinutes}`} />
        <MetricCard icon={<Sparkles size={16} />} label="Strength sessions / week" value={`${insight.metrics.strengthSessionsPerWeek} / ${insight.targets.weeklyStrengthSessions}`} />
      </div>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8e8e93" }}>Action Plan</p>
        <ul className="space-y-2">
          {insight.recommendations.map((line, i) => (
            <li key={i} className="text-sm" style={{ color: "#f5f5f7" }}>• {line}</li>
          ))}
        </ul>
      </div>

      {insight.microPlan && (
        <div className="card p-4 mb-4" style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.2)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Tomorrow Micro Plan ({insight.microPlan.tomorrow})</p>
          <ul className="space-y-1 text-sm" style={{ color: "#f5f5f7" }}>
            <li>• Cardio: {insight.microPlan.cardio.minutes} min ({insight.microPlan.cardio.distanceKm} km target) — {insight.microPlan.cardio.guidance}</li>
            <li>• Strength: {insight.microPlan.strength.exercise} ({insight.microPlan.strength.equipment}) — {insight.microPlan.strength.sets}×{insight.microPlan.strength.reps} @ {insight.microPlan.strength.weightKg || "set default"} kg (~{insight.microPlan.strength.durationMinutes} min)</li>
            <li>• Recovery: {insight.microPlan.recovery.hydrationLiters}L water, {insight.microPlan.recovery.sleepHours} hours sleep</li>
          </ul>
        </div>
      )}

      <div className="card p-4" style={{ background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.25)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Weekly Targets from AI</p>
        <p className="text-sm" style={{ color: "#f5f5f7" }}>
          Add <strong style={{ color: "#30d158" }}>{insight.targets.suggestedExtraRunSessions}</strong> extra run sessions and <strong style={{ color: "#30d158" }}>{insight.targets.suggestedExtraStrengthSessions}</strong> extra strength sessions this week.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1" style={{ color: "#30d158" }}>{icon}<span className="text-[11px] uppercase tracking-wider" style={{ color: "#8e8e93" }}>{label}</span></div>
      <p className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>{value}</p>
    </div>
  );
}
