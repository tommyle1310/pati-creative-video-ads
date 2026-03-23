import { NextRequest, NextResponse } from "next/server";
import { checkKieJobStatus } from "@/lib/studio/kie";

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("jobId");
    if (!taskId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const result = await checkKieJobStatus(taskId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "KIE job status check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
