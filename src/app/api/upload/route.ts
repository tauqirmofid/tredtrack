import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { parseDuration } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${session.user.id}-${Date.now()}.jpg`;
  const filepath = join(uploadsDir, filename);
  await writeFile(filepath, buffer);

  // Try to extract data using pattern matching on raw text
  // We'll do basic OCR via the client side (Tesseract.js)
  // Server just stores image and returns URL
  const imageUrl = `/uploads/${filename}`;

  return NextResponse.json({ imageUrl, message: "Image uploaded. Parsing on client." });
}
