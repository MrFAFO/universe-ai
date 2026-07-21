import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Database modules can only be imported on the server.");
  }
}

function getRequiredEnv(name: "SUPABASE_URL" | "SUPABASE_SECRET_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseServerClient(): SupabaseClient {
  assertServerOnly();

  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
