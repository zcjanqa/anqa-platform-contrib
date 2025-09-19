// apps/frontend/src/app/api/surveys/responses/route.ts
import { NextRequest, NextResponse } from "next/server";

function backendBase() {
  return (
    process.env.API_LOCAL_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://anqa.cloud/api"
  ).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const survey_id = url.searchParams.get("survey_id") || "";
  const client_session_id = url.searchParams.get("client_session_id") || "";
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const ua = req.headers.get("user-agent");
  if (ua) headers["user-agent"] = ua;
  const res = await fetch(
    `${backendBase()}/surveys/responses?survey_id=${encodeURIComponent(survey_id)}&client_session_id=${encodeURIComponent(client_session_id)}`,
    { method: "GET", headers, cache: "no-store" }
  );
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const ua = req.headers.get("user-agent");
  if (ua) headers["user-agent"] = ua;
  const body = await req.text();
  const res = await fetch(`${backendBase()}/surveys/responses`, { method: "POST", headers, body, cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}


