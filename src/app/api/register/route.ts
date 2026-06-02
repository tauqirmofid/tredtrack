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
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, username, password: hashed },
    });
    return NextResponse.json({ id: user.id, name: user.name, username: user.username });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
