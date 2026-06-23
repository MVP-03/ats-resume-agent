import { NextRequest, NextResponse } from "next/server";
import { buildDocxBuffer, DocxResumeData } from "@/lib/docx-builder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const data: DocxResumeData = await req.json();
  if (!data.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const buffer = await buildDocxBuffer(data);
    const filename = `${(data.name).replace(/[^a-zA-Z0-9]/g, "_")}_resume.docx`;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DOCX build failed" }, { status: 500 });
  }
}
