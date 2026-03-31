import { NextRequest, NextResponse } from "next/server";
import { login, logout } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await login(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ user });
}

export async function DELETE() {
  await logout();
  return NextResponse.json({ ok: true });
}
