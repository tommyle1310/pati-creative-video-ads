import { NextRequest, NextResponse } from "next/server";
import { checkJobStatus } from "@/lib/studio/vidtory";

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const result = await checkJobStatus(jobId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Job status check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
