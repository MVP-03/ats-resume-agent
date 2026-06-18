import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ats_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { company, role, status, ats_score, job_url, notes, salary_range, applied_date, resume_id } = body;

  if (!company?.trim() || !role?.trim()) {
    return NextResponse.json({ error: "Company and role are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ats_applications")
    .insert({
      company: company.trim(),
      role: role.trim(),
      status: status ?? "wishlist",
      ats_score: ats_score ?? null,
      job_url: job_url?.trim() || null,
      notes: notes?.trim() || null,
      salary_range: salary_range?.trim() || null,
      applied_date: applied_date || null,
      resume_id: resume_id || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
