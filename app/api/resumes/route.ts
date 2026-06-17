import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const folder_id = req.nextUrl.searchParams.get("folder_id");

  let query = supabase
    .from("ats_resumes")
    .select("*")
    .order("created_at", { ascending: false });

  if (folder_id) query = query.eq("folder_id", folder_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { folder_id, label, resume_text, job_description, ats_score, score_data, tailored_text } = body;

  if (!folder_id) return NextResponse.json({ error: "folder_id required." }, { status: 400 });

  const { data, error } = await supabase
    .from("ats_resumes")
    .insert({ folder_id, label: label || "Untitled", resume_text, job_description, ats_score, score_data, tailored_text })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
