import { NextResponse } from "next/server";
import { checkAdminPassword, signToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const token = signToken(timestamp);

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ success: false, error: "Authentication service error" }, { status: 500 });
  }
}
