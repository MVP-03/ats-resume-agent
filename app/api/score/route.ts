import { NextRequest, NextResponse } from "next/server";
import { scoreResume } from "@/lib/ats-scorer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();
    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Both resume text and job description are required." },
        { status: 400 }
      );
    }
    const result = scoreResume(resumeText, jobDescription);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to score resume." }, { status: 500 });
  }
}
