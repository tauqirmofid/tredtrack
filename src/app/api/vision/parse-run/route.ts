import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type VisionResult = {
  duration: string | null;
  distance: number | null;
  confidence: number | null;
};

function normalizeDuration(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\s*[:.]\s*([0-5]\d)/);
  if (!m) return null;
  return `${Number(m[1])}:${m[2]}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Vision AI key not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const mime = image.type || "image/jpeg";
  const base64 = buf.toString("base64");

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are reading a treadmill LCD display photo.
Look carefully at ALL the numbers on the screen.
Identify which number is the ELAPSED TIME (format like M:SS or MM:SS) and which is the DISTANCE (in km, usually a decimal like 3.50).
DO NOT confuse speed (e.g. 8.0 km/h) with time or distance.
Elapsed time is typically labeled TIME or shown in M:SS format with a colon separator.
Distance is typically labeled DIST or KM and is a small decimal number.
Return ONLY a JSON object with no markdown or code fences:
{"duration": "M:SS or null", "distance": number_or_null, "confidence": 0_to_1}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: "Vision request failed", detail: text }, { status: 502 });
  }

  const json = await response.json();
  const rawText: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown code fences if Gemini wraps the JSON
  const cleaned = rawText.replace(/```[a-z]*\n?/gi, "").trim();

  let parsed: Partial<VisionResult> = {};
  try {
    parsed = JSON.parse(cleaned) as Partial<VisionResult>;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]) as Partial<VisionResult>; } catch { /* ignore */ }
    }
  }

  const duration = normalizeDuration(typeof parsed.duration === "string" ? parsed.duration : null);
  const distance = typeof parsed.distance === "number" && Number.isFinite(parsed.distance) ? parsed.distance : null;
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;

  return NextResponse.json({ duration, distance, confidence });
}
