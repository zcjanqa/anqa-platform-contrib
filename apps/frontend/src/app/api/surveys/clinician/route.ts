// apps/frontend/src/app/api/surveys/clinician/route.ts
// Next.js route that proxies to backend API, attaching auth if present

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl =
    process.env.API_LOCAL_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://anqa.cloud/api";

  const body = await req.text();
  const headers: Record<string, string> = { "content-type": "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["x-forwarded-for"] = xff;

  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/surveys/clinician`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}

export async function GET(req: NextRequest) {
  const backendUrl =
    process.env.API_LOCAL_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://anqa.cloud/api";
  const url = new URL(req.url);
  const client_session_id = url.searchParams.get("client_session_id") || "";
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/surveys/clinician?client_session_id=${encodeURIComponent(client_session_id)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}


