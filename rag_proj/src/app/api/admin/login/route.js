import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  getAdminApiKey,
  getAdminPassword,
  signToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

export async function POST(request) {
  try {
    if (!getAdminPassword() && !getAdminApiKey()) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: ADMIN_PASSWORD / ADMIN_API_KEY is not configured in .env.local.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!password) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const token = signToken(timestamp);
    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      (typeof request.url === "string" && request.url.startsWith("https://"));

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
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
