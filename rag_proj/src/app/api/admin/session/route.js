import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(request) {
  const auth = verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({ authenticated: true, via: auth.via }, { status: 200 });
}
