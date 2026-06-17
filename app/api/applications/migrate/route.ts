import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase env vars." }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);

  const { error } = await admin.rpc("exec_sql", {
    sql: `
      create table if not exists ats_applications (
        id uuid primary key default gen_random_uuid(),
        company text not null,
        role text not null,
        status text not null default 'wishlist'
          check (status in ('wishlist','applied','screen','interview','offer','rejected')),
        ats_score integer,
        job_url text,
        notes text,
        salary_range text,
        applied_date date,
        resume_id uuid,
        created_at timestamptz default now()
      );
    `,
  });

  // exec_sql may not exist — fall back to direct table check
  if (error) {
    // Try direct insert to see if table exists
    const { error: checkError } = await admin.from("ats_applications").select("id").limit(1);
    if (checkError && checkError.code === "42P01") {
      return NextResponse.json({
        error: "Table does not exist. Please run the SQL in supabase/migrations/create_ats_applications.sql in your Supabase SQL editor.",
        sql: true,
      }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: true });
}
