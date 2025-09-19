// apps/frontend/src/app/api/surveys/definition/[survey_id]/route.ts
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ survey_id: string }> }) {
  const backendUrl =
    process.env.API_LOCAL_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://anqa.cloud/api";

  const { survey_id } = await params;

  const res = await fetch(`${backendUrl.replace(/\/$/, "")}/surveys/definition/${encodeURIComponent(survey_id)}`, {
    method: "GET",
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}


