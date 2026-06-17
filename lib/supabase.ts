import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export interface Resume {
  id: string;
  folder_id: string;
  label: string;
  resume_text: string | null;
  job_description: string | null;
  ats_score: number | null;
  score_data: unknown | null;
  tailored_text: string | null;
  created_at: string;
}
