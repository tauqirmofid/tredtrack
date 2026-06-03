"use client";

import { useEffect, useState } from "react";
import { Brain, Loader2, Sparkles, Target, TrendingDown, Ruler, Scale, Droplets, MoonStar, Activity } from "lucide-react";

type InsightResponse = {
  profile: {
    name: string;
    weightKg: number | null;
    heightCm?: number | null;
    bmi?: number | null;
    bmiCategory?: string | null;
  };
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
      suggestedNextWeightKg?: number;
      durationMinutes: number;
    };
    recovery: {
      hydrationLiters: number;
      sleepHours: string;
    };
  };
  weightAnalysis?: {
    currentWeightKg: number | null;
    bmiText: string;
    expectedChangeKg: number;
    actualChangeKg: number | null;
    alignedWithPlan: boolean;
    message: string;
    logs: Array<{ date: string; weightKg: number }>;
  };
  summary: string;
  recommendations: string[];
};

type ProfileResponse = {
  weightKg: number | null;
  heightCm?: number | null;
  weightLogs?: Array<{ id: string; date: string; weightKg: number; source: string }>;
};

function cmToFtIn(cm: number) {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  return { ft, inches };
}

function ftInToCm(ft: number, inches: number) {
  return Number(((ft * 12 + inches) * 2.54).toFixed(1));
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [heightMode, setHeightMode] = useState<"cm" | "ftin">("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLogs, setWeightLogs] = useState<Array<{ date: string; weightKg: number }>>([]);
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
    const profile = await safeJson<ProfileResponse>(profileRes, { weightKg: null, heightCm: null, weightLogs: [] });
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
      setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
      if (profile.heightCm) {
        const converted = cmToFtIn(profile.heightCm);
        setHeightFt(String(converted.ft));
        setHeightIn(String(converted.inches));
      }
      setWeightLogs((profile.weightLogs ?? []).map((w) => ({ date: w.date, weightKg: w.weightKg })));
      setLoading(false);
      return;
    }
    setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
    setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
    if (profile.heightCm) {
      const converted = cmToFtIn(profile.heightCm);
      setHeightFt(String(converted.ft));
      setHeightIn(String(converted.inches));
    }
    setWeightLogs((profile.weightLogs ?? []).map((w) => ({ date: w.date, weightKg: w.weightKg })));
    setInsight(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBodyMetrics() {
    if (!weightKg) return;
    setStatus(null);
    setSaving(true);
    const normalizedHeightCm = heightMode === "cm"
      ? (heightCm ? Number(heightCm) : null)
      : (heightFt || heightIn ? ftInToCm(Number(heightFt) || 0, Number(heightIn) || 0) : null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weightKg: Number(weightKg),
        heightCm: normalizedHeightCm,
      }),
    });
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res, {});
      setStatus({ kind: "error", text: data.error ?? "Could not save weight." });
      setSaving(false);
      return;
    }
    setStatus({ kind: "success", text: "Weight and height saved." });
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
    <div className="px-4 pt-14 pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>AI Coach</h1>
        <p className="text-sm mt-1" style={{ color: "#8e8e93" }}>Personalized plan from your run, strength, and body metrics.</p>
      </div>

      <div className="card p-4 mb-4" style={{ background: "linear-gradient(135deg, #1f2630, #20242b)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#a0a0a7" }}>Body Metrics</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs flex items-center gap-1 mb-1" style={{ color: "#8e8e93" }}><Scale size={12} /> Weight (kg)</label>
            <input className="input-field" type="number" min={1} step="0.1" value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 72.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs flex items-center gap-1" style={{ color: "#8e8e93" }}><Ruler size={12} /> Height</label>
              <div className="flex gap-1">
                <button className="px-2 py-1 text-[11px] rounded-md" style={heightMode === "cm" ? { background: "#30d15822", color: "#30d158" } : { color: "#8e8e93" }} onClick={() => setHeightMode("cm")}>cm</button>
                <button className="px-2 py-1 text-[11px] rounded-md" style={heightMode === "ftin" ? { background: "#30d15822", color: "#30d158" } : { color: "#8e8e93" }} onClick={() => setHeightMode("ftin")}>ft/in</button>
              </div>
            </div>
            {heightMode === "cm" ? (
              <input className="input-field" type="number" min={80} max={250} value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 175" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input className="input-field" type="number" min={3} max={8} value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)} placeholder="ft" />
                <input className="input-field" type="number" min={0} max={11} value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)} placeholder="in" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button className="btn-primary w-auto px-5" onClick={saveBodyMetrics} disabled={saving || !weightKg}>
            {saving ? "Saving..." : "Save Metrics"}
          </button>
          {insight.profile.bmi && (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(10,132,255,0.15)", color: "#64d2ff" }}>
              BMI {insight.profile.bmi} · {insight.profile.bmiCategory}
            </span>
          )}
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

      {insight.weightAnalysis && (
        <div className="card p-4 mb-4" style={{ border: insight.weightAnalysis.alignedWithPlan ? "1px solid rgba(48,209,88,0.25)" : "1px solid rgba(255,159,10,0.35)", background: insight.weightAnalysis.alignedWithPlan ? "rgba(48,209,88,0.06)" : "rgba(255,159,10,0.08)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Weight Reality Check</p>
          <p className="text-sm mb-2" style={{ color: "#f5f5f7" }}>{insight.weightAnalysis.message}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p style={{ color: "#c7c7cc" }}>Expected Δ (14d): <span style={{ color: "#f5f5f7" }}>{insight.weightAnalysis.expectedChangeKg} kg</span></p>
            <p style={{ color: "#c7c7cc" }}>Actual Δ (14d): <span style={{ color: "#f5f5f7" }}>{insight.weightAnalysis.actualChangeKg ?? "N/A"} kg</span></p>
          </div>
        </div>
      )}

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
        <div className="card p-4 mb-4" style={{ background: "linear-gradient(135deg, #0f2a1a, #102235)", border: "1px solid rgba(48,209,88,0.22)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Tomorrow Micro Plan ({insight.microPlan.tomorrow})</p>
          <ul className="space-y-1 text-sm" style={{ color: "#f5f5f7" }}>
            <li>• Cardio: {insight.microPlan.cardio.minutes} min ({insight.microPlan.cardio.distanceKm} km target) — {insight.microPlan.cardio.guidance}</li>
            <li>• Strength: {insight.microPlan.strength.exercise} ({insight.microPlan.strength.equipment}) — {insight.microPlan.strength.sets}×{insight.microPlan.strength.reps} @ {insight.microPlan.strength.weightKg || "set default"} kg (~{insight.microPlan.strength.durationMinutes} min)
              {insight.microPlan.strength.suggestedNextWeightKg ? `, next target ${insight.microPlan.strength.suggestedNextWeightKg} kg` : ""}
            </li>
            <li>• Recovery: <Droplets size={12} className="inline" /> {insight.microPlan.recovery.hydrationLiters}L water · <MoonStar size={12} className="inline" /> {insight.microPlan.recovery.sleepHours} h sleep</li>
          </ul>
        </div>
      )}

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Weight Log</p>
        {weightLogs.length === 0 ? (
          <p className="text-sm" style={{ color: "#8e8e93" }}>No weight history yet. Save your current weight to start tracking.</p>
        ) : (
          <div className="space-y-1">
            {weightLogs.slice(0, 8).map((entry, idx) => {
              const prev = weightLogs[idx + 1];
              const diff = prev ? Number((entry.weightKg - prev.weightKg).toFixed(1)) : null;
              return (
                <div key={`${entry.date}-${idx}`} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm" style={{ color: "#f5f5f7" }}>{entry.weightKg.toFixed(1)} kg</p>
                    <p className="text-[11px]" style={{ color: "#8e8e93" }}>{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs" style={{ color: diff === null ? "#8e8e93" : diff <= 0 ? "#30d158" : "#ff9f0a" }}>
                    {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff} kg`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-4" style={{ background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.25)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>Weekly Targets from AI</p>
        <p className="text-sm" style={{ color: "#f5f5f7" }}>
          Add <strong style={{ color: "#30d158" }}>{insight.targets.suggestedExtraRunSessions}</strong> extra run sessions and <strong style={{ color: "#30d158" }}>{insight.targets.suggestedExtraStrengthSessions}</strong> extra strength sessions this week.
        </p>
      </div>

      <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs" style={{ color: "#8e8e93" }}><Activity size={12} className="inline mr-1" /> Coach notes update after each run, strength log, and weight entry. Keep inputs daily for best predictions.</p>
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
