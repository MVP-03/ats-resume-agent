import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = await import("pdf-parse") as any;
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);

    if (!data.text?.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Try a text-based PDF (not a scanned image)." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: data.text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `PDF parsing failed: ${msg}` }, { status: 500 });
  }
}
