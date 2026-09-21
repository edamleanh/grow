import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — use from Client Components only (e.g. for
// Supabase Auth sign-in forms). Server Components/Actions use
// src/lib/supabase/server.ts instead so cookies are handled correctly.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
