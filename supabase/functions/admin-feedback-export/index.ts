import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigins = new Set([
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname === "vercel.app" || url.hostname.endsWith(".vercel.app"));
  } catch {
    return false;
  }
}

function responseHeaders(origin: string | null) {
  const headers = new Headers({
    "Cache-Control": "no-store, private",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  });
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origin not allowed." }, 403, null);
  if (request.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  const authHeader = request.headers.get("Authorization") || "";
  const accessToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return json({ error: "Sign in with an admin account to export feedback." }, 401, origin);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !publishableKey || !secretKey) {
    return json({ error: "The export service is not configured." }, 500, origin);
  }

  const authClient = createClient(projectUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: "Your session is invalid. Please sign in again." }, 401, origin);

  const adminClient = createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: allowedAdmin, error: allowlistError } = await adminClient
    .from("feedback_admins")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (allowlistError) {
    console.error("Admin allowlist check failed:", allowlistError.message);
    return json({ error: "Could not verify export access." }, 500, origin);
  }
  if (!allowedAdmin) return json({ error: "This account is not authorized to export feedback." }, 403, origin);

  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await adminClient
      .from("product_feedback")
      .select("id, created_at, person_name, email, category, feedback_text, attachment_paths, source_url")
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) {
      console.error("Feedback export query failed:", error.message);
      return json({ error: "Could not load feedback for export." }, 500, origin);
    }
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  return json({ rows }, 200, origin);
});
