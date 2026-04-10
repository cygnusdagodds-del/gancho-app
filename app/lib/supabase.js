import { createClient } from "@supabase/supabase-js";

let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;

  const url = typeof window !== "undefined"
    ? window.ENV?.SUPABASE_URL
    : process.env.SUPABASE_URL;

  const key = typeof window !== "undefined"
    ? window.ENV?.SUPABASE_KEY
    : process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.warn("Supabase: SUPABASE_URL ou SUPABASE_KEY não configuradas.");
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// Proxy que cria o client sob demanda (compatível com imports existentes)
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) {
      if (prop === "from") return () => ({ select: () => ({ data: [], error: null }), insert: () => ({ error: null }), update: () => ({ error: null }), delete: () => ({ error: null }) });
      return () => {};
    }
    const val = client[prop];
    return typeof val === "function" ? val.bind(client) : val;
  }
});
