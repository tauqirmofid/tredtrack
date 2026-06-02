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

  const apiKey = process.env.OPENAI_API_KEY;
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
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract treadmill values from display photos. Return strict JSON: {\"duration\": \"M:SS\" | null, \"distance\": number | null, \"confidence\": number(0..1)}. If uncertain, set null.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read treadmill elapsed time and distance in km. Ignore speed and other metrics.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: "Vision request failed", detail: text }, { status: 502 });
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ duration: null, distance: null, confidence: null });
  }

  let parsed: Partial<VisionResult> = {};
  try {
    parsed = JSON.parse(content) as Partial<VisionResult>;
  } catch {
    return NextResponse.json({ duration: null, distance: null, confidence: null });
  }

  const duration = normalizeDuration(typeof parsed.duration === "string" ? parsed.duration : null);
  const distance = typeof parsed.distance === "number" && Number.isFinite(parsed.distance) ? parsed.distance : null;
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;

  return NextResponse.json({ duration, distance, confidence });
}
