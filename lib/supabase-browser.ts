import { createBrowserClient } from "@supabase/ssr";

const strip = (s: string) => s?.replace(/^﻿/, "").trim();

export function createClient() {
  return createBrowserClient(
    strip(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    strip(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
}
