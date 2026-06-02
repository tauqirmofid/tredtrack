import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Image storage is not available on Vercel serverless — images are processed
// client-side (OCR/Vision AI) and we only persist run stats, not the photo.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Consume the body so the request doesn't hang
  await req.formData();

  return NextResponse.json({ imageUrl: null });
}
