"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Upload, Loader2, CheckCircle, ChevronLeft, X, Lightbulb } from "lucide-react";
import { parseDuration, calcAvgSpeed } from "@/lib/utils";
import { createWorker } from "tesseract.js";

type Mode = "choose" | "camera" | "manual";

export default function LogRunPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) ?? "choose";
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="px-4 pt-14 pb-4">
      <div className="flex items-center gap-3 mb-6 fade-in-up">
        <button onClick={() => mode !== "choose" ? setMode("choose") : router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <ChevronLeft size={20} style={{ color: "#f5f5f7" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "#f5f5f7" }}>Log a Run</h1>
      </div>

      {mode === "choose" && <ModeChooser onSelect={setMode} />}
      {mode === "camera" && <CameraMode />}
      {mode === "manual" && <ManualMode />}
    </div>
  );
}

function ModeChooser({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <div className="flex flex-col gap-4 fade-in-up">
      <button
        onClick={() => onSelect("camera")}
        className="card p-6 flex items-center gap-4 active:scale-95 transition-transform text-left w-full"
        style={{ border: "2px solid rgba(48,209,88,0.3)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #30d158, #25a244)" }}>
          <Camera size={26} color="white" />
        </div>
        <div>
          <p className="text-base font-bold mb-1" style={{ color: "#f5f5f7" }}>📷 Snap & Track</p>
          <p className="text-sm" style={{ color: "#8e8e93" }}>
            Take a photo of your treadmill display — we&apos;ll read the numbers automatically
          </p>
          <span className="inline-block mt-2 text-xs px-2 py-1 rounded-lg font-medium"
            style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}>
            Recommended ⭐
          </span>
        </div>
      </button>

      <button
        onClick={() => onSelect("manual")}
        className="card p-6 flex items-center gap-4 active:scale-95 transition-transform text-left w-full">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0a84ff, #0060dd)" }}>
          <Upload size={26} color="white" />
        </div>
        <div>
          <p className="text-base font-bold mb-1" style={{ color: "#f5f5f7" }}>✍️ Manual Entry</p>
          <p className="text-sm" style={{ color: "#8e8e93" }}>
            Enter time and distance yourself
          </p>
        </div>
      </button>

      {/* Tips */}
      <div className="card p-4 mt-2" style={{ background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.2)" }}>
        <div className="flex items-start gap-3">
          <Lightbulb size={18} style={{ color: "#ff9f0a", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#ff9f0a" }}>Tips for best photo results</p>
            <ul className="text-xs space-y-1" style={{ color: "#8e8e93" }}>
              <li>• Hold phone steady, 20–30 cm from display</li>
              <li>• Ensure display is fully lit and not glaring</li>
              <li>• Make sure time (MM:SS) and distance are visible</li>
              <li>• Capture right after finishing your run</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraMode() {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocr, setOcr] = useState<{ duration?: string; distance?: string } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [form, setForm] = useState({ duration: "", distance: "", notes: "", date: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setOcrLoading(true);
    try {
      const worker = await createWorker("eng");
      const url = URL.createObjectURL(file);
      const { data: { text } } = await worker.recognize(url);
      await worker.terminate();

      // Parse time pattern: digits:digits:digits or digits:digits
      const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)/g);
      // Parse distance: a number like 3.50, 0.32 etc
      const distMatch = text.match(/(\d+\.\d{1,2})/g);

      const extracted: { duration?: string; distance?: string } = {};
      if (timeMatch && timeMatch.length > 0) {
        // Prefer longest match
        extracted.duration = timeMatch.sort((a, b) => b.length - a.length)[0];
      }
      if (distMatch && distMatch.length > 0) {
        // Filter plausible distances (0.1 – 99)
        const dists = distMatch.map(Number).filter((n) => n > 0.05 && n < 100);
        if (dists.length > 0) {
          extracted.distance = String(Math.min(...dists));
        }
      }

      setOcr(extracted);
      setForm((f) => ({
        ...f,
        duration: extracted.duration ?? f.duration,
        distance: extracted.distance ?? f.distance,
      }));
    } catch {
      // silently ignore OCR errors
    }
    setOcrLoading(false);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    processImage(file);
  }

  async function handleSave() {
    if (!form.duration || !form.distance) return;
    setSaving(true);

    let imageUrl: string | null = null;
    if (image) {
      const fd = new FormData();
      fd.append("image", image);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      imageUrl = data.imageUrl;
    }

    const durationSec = parseDuration(form.duration);
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: durationSec,
        distance: parseFloat(form.distance),
        date: form.date,
        notes: form.notes,
        imageUrl,
        source: "image",
      }),
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 fade-in-up">
        <CheckCircle size={64} style={{ color: "#30d158" }} />
        <p className="text-xl font-bold mt-4" style={{ color: "#f5f5f7" }}>Run Saved! 🎉</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 fade-in-up">
      {/* Image picker */}
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="card flex flex-col items-center justify-center gap-3 py-16 active:scale-95 transition-transform"
          style={{ border: "2px dashed rgba(48,209,88,0.4)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(48,209,88,0.15)" }}>
            <Camera size={28} style={{ color: "#30d158" }} />
          </div>
          <p className="font-semibold" style={{ color: "#f5f5f7" }}>Tap to add photo</p>
          <p className="text-sm" style={{ color: "#8e8e93" }}>Take a new photo or choose from library</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </button>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Treadmill" className="w-full rounded-2xl object-cover max-h-64" />
          <button
            onClick={() => { setPreview(null); setImage(null); setOcr(null); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <X size={16} color="white" />
          </button>
          {ocrLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
                <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Reading display…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {ocr && !ocrLoading && (
        <div className="card p-3" style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#30d158" }}>✓ Auto-detected</p>
          <p className="text-xs" style={{ color: "#8e8e93" }}>
            {ocr.duration && `Time: ${ocr.duration}`}{ocr.duration && ocr.distance && " · "}
            {ocr.distance && `Distance: ${ocr.distance} km`}
          </p>
          <p className="text-xs mt-1" style={{ color: "#8e8e93" }}>Please verify the values below before saving</p>
        </div>
      )}

      {/* Form */}
      <div className="card p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>
            Duration (MM:SS or HH:MM:SS) *
          </label>
          <input
            className="input-field"
            placeholder="30:00"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>
            Distance (km) *
          </label>
          <input
            className="input-field"
            placeholder="3.50"
            type="number"
            step="0.01"
            min="0"
            value={form.distance}
            onChange={(e) => setForm({ ...form, distance: e.target.value })}
          />
        </div>
        {form.duration && form.distance && (
          <div className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
            Avg Speed: {calcAvgSpeed(parseFloat(form.distance || "0"), parseDuration(form.duration))} km/h
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Date & Time</label>
          <input
            className="input-field"
            type="datetime-local"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Notes (optional)</label>
          <input className="input-field" placeholder="Felt great today!" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={saving || !form.duration || !form.distance}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Saving…</span> : "Save Run"}
      </button>
    </div>
  );
}

function ManualMode() {
  const router = useRouter();
  const [form, setForm] = useState({ duration: "", distance: "", notes: "", date: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    if (!form.duration || !form.distance) return;
    setSaving(true);
    const durationSec = parseDuration(form.duration);
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: durationSec,
        distance: parseFloat(form.distance),
        date: form.date,
        notes: form.notes,
        source: "manual",
      }),
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 fade-in-up">
        <CheckCircle size={64} style={{ color: "#30d158" }} />
        <p className="text-xl font-bold mt-4" style={{ color: "#f5f5f7" }}>Run Saved! 🎉</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 fade-in-up">
      <div className="card p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Duration (MM:SS) *</label>
          <input className="input-field" placeholder="30:00" value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Distance (km) *</label>
          <input className="input-field" placeholder="3.50" type="number" step="0.01" min="0"
            value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
        </div>
        {form.duration && form.distance && (
          <div className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
            Avg Speed: {calcAvgSpeed(parseFloat(form.distance || "0"), parseDuration(form.duration))} km/h
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Notes (optional)</label>
          <input className="input-field" placeholder="How did it feel?" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving || !form.duration || !form.distance}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Saving…</span> : "Save Run"}
      </button>
    </div>
  );
}
