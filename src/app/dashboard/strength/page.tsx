"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Loader2, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";

type Equipment = "dumbbell" | "barbell";

type Profile = {
  weightKg: number | null;
  dumbbellWeightKg: number | null;
  barbellWeightKg: number | null;
  name?: string | null;
};

type StrengthLog = {
  id: string;
  equipment: Equipment;
  exercise: string;
  weightKg: number;
  sets: number;
  reps: number;
  durationMinutes: number | null;
  volumeKg: number;
  calories: number | null;
  date: string;
  notes: string | null;
};

function getLocalDateTimeValue(date = new Date()): string {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export default function StrengthPage() {
  const [logs, setLogs] = useState<StrengthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  const [defaults, setDefaults] = useState({ dumbbellWeightKg: "", barbellWeightKg: "" });
  const [form, setForm] = useState({
    equipment: "dumbbell" as Equipment,
    exercise: "",
    weightKg: "",
    sets: "3",
    reps: "10",
    durationMinutes: "",
    date: getLocalDateTimeValue(),
    notes: "",
  });

  const totalVolume = useMemo(() => logs.reduce((s, l) => s + l.volumeKg, 0), [logs]);

  async function load() {
    const [profileRes, logsRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/strength?limit=40"),
    ]);
    const profileData = await profileRes.json() as Profile;
    const logsData = await logsRes.json() as StrengthLog[];

    setDefaults({
      dumbbellWeightKg: profileData.dumbbellWeightKg ? String(profileData.dumbbellWeightKg) : "",
      barbellWeightKg: profileData.barbellWeightKg ? String(profileData.barbellWeightKg) : "",
    });

    setForm((prev) => ({
      ...prev,
      weightKg: prev.weightKg || (profileData.dumbbellWeightKg ? String(profileData.dumbbellWeightKg) : ""),
    }));

    setLogs(logsData);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const suggested = prev.equipment === "dumbbell" ? defaults.dumbbellWeightKg : defaults.barbellWeightKg;
      return { ...prev, weightKg: suggested || prev.weightKg };
    });
  }, [form.equipment, defaults.dumbbellWeightKg, defaults.barbellWeightKg]);

  async function saveDefaults() {
    setSavingDefaults(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dumbbellWeightKg: defaults.dumbbellWeightKg ? Number(defaults.dumbbellWeightKg) : null,
        barbellWeightKg: defaults.barbellWeightKg ? Number(defaults.barbellWeightKg) : null,
      }),
    });
    await load();
    setSavingDefaults(false);
  }

  async function saveLog() {
    if (!form.exercise.trim() || !form.weightKg || !form.sets || !form.reps) return;

    setSavingLog(true);
    await fetch("/api/strength", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipment: form.equipment,
        exercise: form.exercise,
        weightKg: Number(form.weightKg),
        sets: Number(form.sets),
        reps: Number(form.reps),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        date: form.date,
        notes: form.notes || null,
      }),
    });
    await load();
    setForm((prev) => ({ ...prev, exercise: "", notes: "", date: getLocalDateTimeValue() }));
    setSavingLog(false);
  }

  async function deleteLog(id: string) {
    if (!confirm("Delete this workout log?")) return;
    await fetch(`/api/strength?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-4">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f7" }}>Strength Log</h1>
      <p className="text-sm mb-6" style={{ color: "#8e8e93" }}>Set your dumbbell/barbell defaults and log each session with exact lifted weight.</p>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8e8e93" }}>Default Equipment Weight (kg)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#8e8e93" }}>Dumbbell</label>
            <input className="input-field" type="number" min={0} step="0.5" value={defaults.dumbbellWeightKg}
              onChange={(e) => setDefaults((p) => ({ ...p, dumbbellWeightKg: e.target.value }))} placeholder="e.g. 12" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "#8e8e93" }}>Barbell</label>
            <input className="input-field" type="number" min={0} step="0.5" value={defaults.barbellWeightKg}
              onChange={(e) => setDefaults((p) => ({ ...p, barbellWeightKg: e.target.value }))} placeholder="e.g. 40" />
          </div>
        </div>
        <button className="btn-secondary mt-3 flex items-center justify-center gap-2" onClick={saveDefaults} disabled={savingDefaults}>
          {savingDefaults ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Defaults
        </button>
      </div>

      <div className="card p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8e8e93" }}>Log Workout</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button className="btn-secondary" onClick={() => setForm((p) => ({ ...p, equipment: "dumbbell" }))}
            style={form.equipment === "dumbbell" ? { borderColor: "#30d158", color: "#30d158" } : undefined}>Dumbbell</button>
          <button className="btn-secondary" onClick={() => setForm((p) => ({ ...p, equipment: "barbell" }))}
            style={form.equipment === "barbell" ? { borderColor: "#30d158", color: "#30d158" } : undefined}>Barbell</button>
        </div>

        <div className="space-y-3">
          <input className="input-field" placeholder="Exercise name (e.g. Bench Press)" value={form.exercise}
            onChange={(e) => setForm((p) => ({ ...p, exercise: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <input className="input-field" type="number" min={0} step="0.5" placeholder="Weight kg" value={form.weightKg}
              onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))} />
            <input className="input-field" type="number" min={1} placeholder="Sets" value={form.sets}
              onChange={(e) => setForm((p) => ({ ...p, sets: e.target.value }))} />
            <input className="input-field" type="number" min={1} placeholder="Reps" value={form.reps}
              onChange={(e) => setForm((p) => ({ ...p, reps: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" type="number" min={0} placeholder="Duration (min)" value={form.durationMinutes}
              onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} />
            <input className="input-field" type="datetime-local" value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <input className="input-field" placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <button className="btn-primary" onClick={saveLog} disabled={savingLog || !form.weightKg || !form.exercise}>
            {savingLog ? "Saving…" : "Save Workout"}
          </button>
        </div>
      </div>

      <div className="card p-4 mb-4" style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
        <p className="text-xs uppercase tracking-wider" style={{ color: "#8e8e93" }}>Last 40 sessions</p>
        <p className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>{Math.round(totalVolume).toLocaleString()} <span className="text-sm font-normal" style={{ color: "#8e8e93" }}>kg total volume</span></p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10">
          <Dumbbell size={42} className="mx-auto mb-3" style={{ color: "#8e8e93" }} />
          <p style={{ color: "#f5f5f7" }}>No strength logs yet.</p>
          <p className="text-sm" style={{ color: "#8e8e93" }}>Log your first set to start tracking progression.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="card px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>{log.exercise}</p>
                <p className="text-xs" style={{ color: "#8e8e93" }}>
                  {log.equipment} · {log.weightKg} kg · {log.sets}×{log.reps} · {format(new Date(log.date), "EEE, MMM d")}
                </p>
                {log.notes && <p className="text-xs mt-1" style={{ color: "#636366" }}>{log.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: "#30d158" }}>{Math.round(log.volumeKg)} kg</p>
                  <p className="text-[11px]" style={{ color: "#8e8e93" }}>{log.calories ? `${Math.round(log.calories)} kcal` : ""}</p>
                </div>
                <button onClick={() => deleteLog(log.id)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: "#ff453a", background: "rgba(255,69,58,0.1)" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
