import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, username, password } = await req.json();
    if (!name || !username || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, username, password: hashed },
      select: { id: true, name: true, username: true },
    });
    return NextResponse.json({ id: user.id, name: user.name, username: user.username });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("database_url") || message.includes("libsql") || message.includes("sqlite") || message.includes("db")) {
      return NextResponse.json({ error: "Database unavailable. Please try again in a moment." }, { status: 503 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
