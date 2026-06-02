"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Upload, Loader2, CheckCircle, ChevronLeft, X, Lightbulb } from "lucide-react";
import { calcAvgSpeed } from "@/lib/utils";
import { createWorker } from "tesseract.js";

type Mode = "choose" | "camera" | "manual";

function extractTreadmillDuration(text: string): string | null {
  const normalized = text
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/,/g, ".");

  const colonMatches = [...normalized.matchAll(/\b(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\b/g)];

  const colonCandidates = colonMatches.map((m) => {
    const first = Number(m[1]);
    const second = Number(m[2]);
    const third = m[3] ? Number(m[3]) : undefined;
    const seconds = third !== undefined
      ? first * 3600 + second * 60 + third
      : first * 60 + second;
    return { raw: m[0].replace(".", ":"), seconds };
  });

  const compactMatches = [...normalized.matchAll(/\b(\d{3,4})\b/g)];
  const compactCandidates = compactMatches.map((m) => {
    const raw = m[1];
    const secs = Number(raw.slice(-2));
    const mins = Number(raw.slice(0, -2));
    return {
      raw: `${mins}:${String(secs).padStart(2, "0")}`,
      seconds: mins * 60 + secs,
    };
  });

  const candidates = [...colonCandidates, ...compactCandidates]
    .filter((c) => c.seconds >= 30 && c.seconds <= 6 * 3600);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.seconds - a.seconds);
  return candidates[0].raw;
}

function extractTreadmillDistance(text: string, durationSeconds?: number): string | null {
  const normalized = text
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/,/g, ".");

  const matches = [...normalized.matchAll(/\b(\d{1,2}\.\d{1,2})\b/g)];
  if (matches.length === 0) return null;

  let candidates = matches
    .map((m) => Number(m[1]))
    .filter((n) => !Number.isNaN(n) && n > 0.05 && n < 100);

  if (durationSeconds && durationSeconds > 0) {
    candidates = candidates.filter((distanceKm) => {
      const speed = distanceKm / (durationSeconds / 3600);
      return speed <= 30 && speed >= 1;
    });
  }

  candidates.sort((a, b) => b - a);

  if (candidates.length === 0) return null;
  return candidates[0].toFixed(2);
}

async function createEnhancedImageUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const originalUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(originalUrl);
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));
          const bw = contrasted > 95 ? 255 : 0;
          data[i] = bw;
          data[i + 1] = bw;
          data[i + 2] = bw;
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(originalUrl);
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(URL.createObjectURL(blob));
        }, "image/png");
      } catch {
        URL.revokeObjectURL(originalUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(originalUrl);
      resolve(null);
    };

    img.src = originalUrl;
  });
}

/** Convert MM:SS string or plain digits to total seconds */
function parseOcrDuration(str: string): { mins: number; secs: number } {
  const parts = str.split(":").map(Number);
  if (parts.length >= 2) return { mins: parts[parts.length - 2], secs: parts[parts.length - 1] };
  return { mins: 0, secs: 0 };
}

function durationToSeconds(mins: number, secs: number) {
  return mins * 60 + secs;
}

/** Reusable duration picker: separate mins + secs boxes */
function DurationPicker({
  mins, secs, onChange,
}: {
  mins: number; secs: number;
  onChange: (mins: number, secs: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>
        Duration *
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col items-center">
          <input
            type="number" min={0} max={999}
            className="input-field text-center text-2xl font-bold"
            style={{ color: "#f5f5f7" }}
            value={mins === 0 ? "" : mins}
            placeholder="0"
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0), secs)}
          />
          <span className="text-xs mt-1 font-medium" style={{ color: "#8e8e93" }}>mins</span>
        </div>
        <span className="text-3xl font-bold pb-4" style={{ color: "#8e8e93" }}>:</span>
        <div className="flex-1 flex flex-col items-center">
          <input
            type="number" min={0} max={59}
            className="input-field text-center text-2xl font-bold"
            style={{ color: "#f5f5f7" }}
            value={secs === 0 ? "" : secs}
            placeholder="00"
            onChange={(e) => {
              let s = parseInt(e.target.value) || 0;
              if (s > 59) s = 59;
              onChange(mins, Math.max(0, s));
            }}
          />
          <span className="text-xs mt-1 font-medium" style={{ color: "#8e8e93" }}>secs</span>
        </div>
      </div>
      {(mins > 0 || secs > 0) && (
        <p className="text-xs mt-1" style={{ color: "#30d158" }}>
          = {mins}m {secs}s total
        </p>
      )}
    </div>
  );
}

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
          <p className="text-sm" style={{ color: "#8e8e93" }}>Enter time and distance yourself</p>
        </div>
      </button>

      <div className="card p-4 mt-2" style={{ background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.2)" }}>
        <div className="flex items-start gap-3">
          <Lightbulb size={18} style={{ color: "#ff9f0a", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#ff9f0a" }}>Tips for best photo results</p>
            <ul className="text-xs space-y-1" style={{ color: "#8e8e93" }}>
              <li>• Hold phone steady, 20–30 cm from display</li>
              <li>• Ensure display is fully lit and not glaring</li>
              <li>• Make sure time and distance are visible</li>
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
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);
  const [form, setForm] = useState({ distance: "", notes: "", date: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setOcrLoading(true);
    setOcr(null);
    setOcrError(null);
    try {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789:.",
        preserve_interword_spaces: "1",
      });
      const url = URL.createObjectURL(file);
      const { data: { text } } = await worker.recognize(url);

      let detectedDuration = extractTreadmillDuration(text);
      let durationSeconds = 0;
      if (detectedDuration) {
        const d = parseOcrDuration(detectedDuration);
        durationSeconds = durationToSeconds(d.mins, d.secs);
      }

      let detectedDistance = extractTreadmillDistance(text, durationSeconds || undefined);

      if (!detectedDuration) {
        const enhancedUrl = await createEnhancedImageUrl(file);
        if (enhancedUrl) {
          const { data: { text: enhancedText } } = await worker.recognize(enhancedUrl);
          URL.revokeObjectURL(enhancedUrl);
          detectedDuration = extractTreadmillDuration(enhancedText);
          if (detectedDuration) {
            const d = parseOcrDuration(detectedDuration);
            durationSeconds = durationToSeconds(d.mins, d.secs);
          }
          if (!detectedDistance) {
            detectedDistance = extractTreadmillDistance(enhancedText, durationSeconds || undefined);
          }
        }
      }

      await worker.terminate();
      URL.revokeObjectURL(url);

      if (detectedDuration || detectedDistance) {
        setOcr({
          duration: detectedDuration ?? undefined,
          distance: detectedDistance ?? undefined,
        });
      }

      if (detectedDuration) {
        const { mins: m, secs: s } = parseOcrDuration(detectedDuration);
        setMins(m); setSecs(s);
      } else {
        setOcrError("Couldn’t detect treadmill time. Please retake photo with timer clearly visible.");
      }

      if (detectedDistance) {
        setForm((f) => ({ ...f, distance: detectedDistance }));
      }
    } catch {
      setOcrError("Couldn’t read this image. Try a clearer, close-up treadmill display photo.");
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
    const totalSecs = durationToSeconds(mins, secs);
    if (totalSecs <= 0 || !form.distance) return;
    setSaving(true);

    let imageUrl: string | null = null;
    if (image) {
      const fd = new FormData();
      fd.append("image", image);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      imageUrl = data.imageUrl;
    }

    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: totalSecs,
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

  const totalSecs = durationToSeconds(mins, secs);
  const canSave = totalSecs > 0 && !!form.distance;

  return (
    <div className="flex flex-col gap-4 fade-in-up">
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
            onClick={() => { setPreview(null); setImage(null); setOcr(null); setOcrError(null); setMins(0); setSecs(0); }}
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

      {ocr?.duration && !ocrLoading && (
        <div className="card p-3" style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#30d158" }}>✓ Auto-detected — verify below</p>
          <p className="text-xs" style={{ color: "#8e8e93" }}>
            {ocr.duration && `Time: ${ocr.duration}`}{ocr.duration && ocr.distance && " · "}
            {ocr.distance && `Distance: ${ocr.distance} km`}
          </p>
        </div>
      )}

      {!ocrLoading && preview && !ocr?.duration && (
        <div className="card p-3" style={{ background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.2)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#ff9f0a" }}>Time not detected</p>
          <p className="text-xs" style={{ color: "#8e8e93" }}>
            {ocrError ?? "Please retake with the treadmill timer centered and clearly lit."}
          </p>
          {ocr?.distance && (
            <p className="text-xs mt-1" style={{ color: "#8e8e93" }}>
              Detected distance: {ocr.distance} km
            </p>
          )}
        </div>
      )}

      <div className="card p-5 flex flex-col gap-4">
        <DurationPicker mins={mins} secs={secs} onChange={(m, s) => { setMins(m); setSecs(s); }} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Distance (km) *</label>
          <input className="input-field" placeholder="3.50" type="number" step="0.01" min="0"
            value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
        </div>
        {canSave && (
          <div className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
            Avg Speed: {calcAvgSpeed(parseFloat(form.distance || "0"), totalSecs)} km/h
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Notes (optional)</label>
          <input className="input-field" placeholder="Felt great today!" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving || !canSave}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Saving…</span> : "Save Run"}
      </button>
    </div>
  );
}

function ManualMode() {
  const router = useRouter();
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);
  const [form, setForm] = useState({ distance: "", notes: "", date: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    const totalSecs = durationToSeconds(mins, secs);
    if (totalSecs <= 0 || !form.distance) return;
    setSaving(true);
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: totalSecs,
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

  const totalSecs = durationToSeconds(mins, secs);
  const canSave = totalSecs > 0 && !!form.distance;

  return (
    <div className="flex flex-col gap-4 fade-in-up">
      <div className="card p-5 flex flex-col gap-4">
        <DurationPicker mins={mins} secs={secs} onChange={(m, s) => { setMins(m); setSecs(s); }} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#8e8e93" }}>Distance (km) *</label>
          <input className="input-field" placeholder="3.50" type="number" step="0.01" min="0"
            value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
        </div>
        {canSave && (
          <div className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(48,209,88,0.1)", color: "#30d158" }}>
            Avg Speed: {calcAvgSpeed(parseFloat(form.distance || "0"), totalSecs)} km/h
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

      <button className="btn-primary" onClick={handleSave} disabled={saving || !canSave}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Saving…</span> : "Save Run"}
      </button>
    </div>
  );
}
