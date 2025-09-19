// apps/frontend/src/app/api/surveys/definitions/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl =
    process.env.API_LOCAL_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://anqa.cloud/api";

  const url = new URL(req.url);
  const params = new URLSearchParams();
  const survey_type = url.searchParams.get("survey_type");
  const version = url.searchParams.get("version");
  const status = url.searchParams.get("status") || "active";
  if (survey_type) params.set("survey_type", survey_type);
  if (version) params.set("version", version);
  if (status) params.set("status", status);

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/surveys/definitions?${params.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}


