import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { latitude, longitude, city, country } = await req.json();
  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Latitude and longitude required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      city: city ?? null,
      country: country ?? null,
    },
    select: {
      latitude: true,
      longitude: true,
      city: true,
      country: true,
    },
  });

  return NextResponse.json({
    latitude: user.latitude,
    longitude: user.longitude,
    city: user.city,
    country: user.country,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { latitude: true, longitude: true, city: true, country: true, name: true },
  });

  return NextResponse.json(user);
}
