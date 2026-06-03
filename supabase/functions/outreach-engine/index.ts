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

  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { data: cfg } = await supabase
    .from("tool_configs").select("*").eq("user_id", user.id).maybeSingle();

  const body = await req.json();
  const { action } = body;

  // ── apollo_search
  if (action === "apollo_search") {
    const { titles, countries, page = 1 } = body;
    if (!cfg?.apollo_api_key) return new Response(JSON.stringify({ error: "Apollo API key not set in Settings." }), { headers: corsHeaders });
    const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": cfg.apollo_api_key },
      body: JSON.stringify({
        person_titles: titles || ["Head of Sustainability", "CBAM Manager", "ESG Director"],
        person_locations: countries || ["Netherlands", "Belgium", "Germany"],
        organization_num_employees_ranges: ["1,200", "201,1000"],
        page, per_page: 25,
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

  // ── hunter_verify
  if (action === "hunter_verify") {
    const { email, domain, first_name, last_name } = body;
    if (!cfg?.hunter_api_key) return new Response(JSON.stringify({ error: "Hunter.io API key not set in Settings." }), { headers: corsHeaders });
    if (email) {
      const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${cfg.hunter_api_key}`);
      const d = await r.json();
      return new Response(JSON.stringify({ result: d.data?.result, score: d.data?.score }), { headers: corsHeaders });
    }
    if (domain && first_name && last_name) {
      const r = await fetch(`https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${first_name}&last_name=${last_name}&api_key=${cfg.hunter_api_key}`);
      const d = await r.json();
      return new Response(JSON.stringify({ email: d.data?.email, score: d.data?.score }), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Provide email or domain+name" }), { headers: corsHeaders });
  }

  // ── import_contacts
  if (action === "import_contacts") {
    const { contacts } = body;
    if (!contacts?.length) return new Response(JSON.stringify({ imported: 0 }), { headers: corsHeaders });
    const toInsert = contacts.map((c: any) => ({ ...c, user_id: user.id, status: "new" }));
    await supabase.from("contacts").upsert(toInsert, { onConflict: "user_id,email", ignoreDuplicates: true });
    return new Response(JSON.stringify({ imported: toInsert.length }), { headers: corsHeaders });
  }

  // ── schedule_followups
  if (action === "schedule_followups") {
    const { contact_ids, tone = "founder", pain = "" } = body;
    const sequence_days = [0, 3, 7, 14];
    const created = [];
    for (const contact_id of contact_ids) {
      const { data: seq } = await supabase.from("sequences").insert({ contact_id, user_id: user.id, tone, pain_point: pain, status: "active" }).select().single();
      if (seq) {
        for (let i = 0; i < sequence_days.length; i++) {
          await supabase.from("messages").insert({ contact_id, sequence_id: seq.id, user_id: user.id, channel: i === 0 ? "linkedin" : i === 2 ? "email" : "followup", touch_number: i + 1, body: "", status: "draft", goal: "demo" });
        }
        created.push(seq.id);
      }
    }
    return new Response(JSON.stringify({ sequences_created: created.length }), { headers: corsHeaders });
  }

  // ── send_mass_email
  if (action === "send_mass_email") {
    const { contact_ids, subject, body_template } = body;
    const logs = [];
    for (const contact_id of contact_ids) {
      const { data: contact } = await supabase.from("contacts").select("*").eq("id", contact_id).single();
      if (contact?.email) {
        await supabase.from("messages").insert({
          contact_id, user_id: user.id, channel: "email", touch_number: 1, subject,
          body: body_template.replace(/{{first_name}}/g, contact.first_name || "").replace(/{{company}}/g, contact.company || "").replace(/{{role}}/g, contact.role || ""),
          status: "sent", sent_at: new Date().toISOString(), goal: "demo"
        });
        await supabase.from("activities").insert({ user_id: user.id, contact_id, type: "Email", company: contact.company, note: `Mass email: ${subject}` });
        logs.push({ contact_id, email: contact.email, name: contact.first_name });
      }
    }
    return new Response(JSON.stringify({ sent: logs.length, contacts: logs }), { headers: corsHeaders });
  }

  // ── generate_email (OpenAI GPT-4o-mini)
  if (action === "generate_email") {
    const { first_name, company, role, country, tone = "founder", pain = "CBAM compliance" } = body;
    if (!cfg?.openai_api_key) return new Response(JSON.stringify({ error: "OpenAI API key not set in Settings." }), { headers: corsHeaders });
    const prompt = `Write a short, personalised cold outreach email (under 100 words) from Manjunath at SupplyMind AI to ${first_name} ${role ? '(' + role + ')' : ''} at ${company} in ${country || 'Europe'}. Focus on ${pain}. Tone: ${tone}. No subject line. Sign off as Manjunath, SupplyMind AI.`;
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${cfg.openai_api_key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 200 })
    });
    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ email: text }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
});
