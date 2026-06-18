import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const strip = (s: string) => s?.replace(/^﻿/, "").trim();

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    strip(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    strip(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}
