import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get user from JWT
  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Load user tool configs
  const { data: cfg } = await supabase
    .from("tool_configs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const body = await req.json();
  const { action } = body;

  // ── ACTION: apollo_search ─────────────────────────────────────────────────
  if (action === "apollo_search") {
    const { titles, countries, company_sizes, page = 1 } = body;
    if (!cfg?.apollo_api_key) {
      return new Response(JSON.stringify({ error: "Apollo API key not configured in Settings." }), { headers: corsHeaders });
    }
    const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": cfg.apollo_api_key },
      body: JSON.stringify({
        person_titles: titles || ["Head of Sustainability", "CBAM Manager", "ESG Director", "Trade Compliance", "Sustainability Manager"],
        person_locations: countries || ["Netherlands", "Belgium", "Germany", "France", "Denmark"],
        organization_num_employees_ranges: company_sizes || ["1,200", "201,1000"],
        page,
        per_page: 25,
      })
    });
    const apolloData = await apolloRes.json();
    const people = (apolloData.people || []).map((p: any) => ({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      company: p.organization?.name || "",
      role: p.title || "",
      email: p.email || "",
      linkedin_url: p.linkedin_url || "",
      country: p.location || "",
      source: "apollo",
    }));
    return new Response(JSON.stringify({ people, total: apolloData.pagination?.total_entries || 0 }), { headers: corsHeaders });
  }

  // ── ACTION: hunter_verify ─────────────────────────────────────────────────
  if (action === "hunter_verify") {
    const { email, domain, first_name, last_name } = body;
    if (!cfg?.hunter_api_key) {
      return new Response(JSON.stringify({ error: "Hunter.io API key not configured in Settings." }), { headers: corsHeaders });
    }
    if (email) {
      const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${cfg.hunter_api_key}`);
      const d = await r.json();
      return new Response(JSON.stringify({ result: d.data?.result, score: d.data?.score, status: d.data?.status }), { headers: corsHeaders });
    }
    if (domain && first_name && last_name) {
      const r = await fetch(`https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${first_name}&last_name=${last_name}&api_key=${cfg.hunter_api_key}`);
      const d = await r.json();
      return new Response(JSON.stringify({ email: d.data?.email, score: d.data?.score }), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Provide email or domain+name" }), { headers: corsHeaders });
  }

  // ── ACTION: import_contacts ───────────────────────────────────────────────
  if (action === "import_contacts") {
    const { contacts } = body;
    if (!contacts?.length) return new Response(JSON.stringify({ imported: 0 }), { headers: corsHeaders });
    const toInsert = contacts.map((c: any) => ({ ...c, user_id: user.id, status: "new" }));
    const { data, error } = await supabase.from("contacts").upsert(toInsert, { onConflict: "user_id,email", ignoreDuplicates: true });
    return new Response(JSON.stringify({ imported: toInsert.length, error: error?.message }), { headers: corsHeaders });
  }

  // ── ACTION: schedule_followups ────────────────────────────────────────────
  if (action === "schedule_followups") {
    const { contact_ids, sequence_days = [0, 3, 7, 14], tone = "founder", pain = "" } = body;
    const created = [];
    for (const contact_id of contact_ids) {
      const { data: seq } = await supabase.from("sequences").insert({
        contact_id, user_id: user.id, tone, pain_point: pain, status: "active"
      }).select().single();
      if (seq) {
        for (let i = 0; i < sequence_days.length; i++) {
          await supabase.from("messages").insert({
            contact_id, sequence_id: seq.id, user_id: user.id,
            channel: i === 0 ? "linkedin" : i === 2 ? "email" : "followup",
            touch_number: i + 1, body: "", status: "draft",
            goal: "demo"
          });
        }
        created.push(seq.id);
      }
    }
    return new Response(JSON.stringify({ sequences_created: created.length }), { headers: corsHeaders });
  }

  // ── ACTION: send_mass_email ───────────────────────────────────────────────
  if (action === "send_mass_email") {
    const { contact_ids, subject, body_template, sender_name } = body;
    // Log all as sent (actual Gmail sending requires OAuth2 — handled client-side via mailto links)
    const logs = [];
    for (const contact_id of contact_ids) {
      const { data: contact } = await supabase.from("contacts").select("*").eq("id", contact_id).single();
      if (contact?.email) {
        await supabase.from("messages").insert({
          contact_id, user_id: user.id, channel: "email",
          touch_number: 1, subject,
          body: body_template
            .replace(/{{first_name}}/g, contact.first_name || "")
            .replace(/{{company}}/g, contact.company || "")
            .replace(/{{role}}/g, contact.role || ""),
          status: "sent", sent_at: new Date().toISOString(), goal: "demo"
        });
        await supabase.from("activities").insert({
          user_id: user.id, contact_id, type: "Email", company: contact.company,
          note: `Mass email: ${subject}`
        });
        logs.push({ contact_id, email: contact.email, name: contact.first_name });
      }
    }
    return new Response(JSON.stringify({ sent: logs.length, contacts: logs }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
});
