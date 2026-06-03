import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, Label, Btn, BtnRow } from "../components/Card";

type Cfg = {
  apollo_api_key: string;
  hunter_api_key: string;
  apify_api_key: string;
  mailmeteor_sheet_url: string;
  gmail_address: string;
  openai_api_key: string;
};

export default function Settings() {
  const [cfg, setCfg] = useState<Cfg>({
    apollo_api_key: "",
    hunter_api_key: "",
    apify_api_key: "",
    mailmeteor_sheet_url: "",
    gmail_address: "",
    openai_api_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("tool_configs").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setCfg({
      apollo_api_key: data.apollo_api_key || "",
      hunter_api_key: data.hunter_api_key || "",
      apify_api_key: data.apify_api_key || "",
      mailmeteor_sheet_url: data.mailmeteor_sheet_url || "",
      gmail_address: data.gmail_address || "",
      openai_api_key: data.openai_api_key || "",
    });
  };

  const save = async () => {
    setSaving(true); setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg("Not logged in"); setSaving(false); return; }
    const { data: existing } = await supabase.from("tool_configs").select("id").eq("user_id", user.id).maybeSingle();
    const payload = { ...cfg, user_id: user.id, updated_at: new Date().toISOString() };
    if (existing?.id) {
      await supabase.from("tool_configs").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("tool_configs").insert(payload);
    }
    setMsg("✅ Saved!");
    setSaving(false);
  };

  const field = (k: keyof Cfg, placeholder: string, secret = false) => (
    <div style={{ marginBottom: 12 }}>
      <input
        type={secret ? "password" : "text"}
        value={cfg[k]}
        onChange={e => setCfg(c => ({ ...c, [k]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: "100%", padding: "9px 12px", background: "#0a0f18", border: "1px solid #2a3348", borderRadius: 7, color: "#e8ecf4", fontSize: 13, boxSizing: "border-box" as const }}
      />
    </div>
  );

  return (
    <div>
      <Card title="⚙️ API Configuration">
        <div style={{ fontSize: 12, color: "#7a8ba6", marginBottom: 16 }}>All keys stored privately in Supabase (RLS — only you can see them).</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <Label>Apollo.io API Key <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" style={{ color: "#4f8ef7", fontSize: 11 }}>Get key →</a></Label>
            {field("apollo_api_key", "Paste Apollo API key...", true)}
            <Label>Hunter.io API Key <a href="https://hunter.io/api" target="_blank" style={{ color: "#4f8ef7", fontSize: 11 }}>Get key →</a></Label>
            {field("hunter_api_key", "Paste Hunter API key...", true)}
            <Label>Apify API Key <a href="https://console.apify.com/account/integrations" target="_blank" style={{ color: "#4f8ef7", fontSize: 11 }}>Get key →</a></Label>
            {field("apify_api_key", "Paste Apify API key...", true)}
          </div>
          <div>
            <Label>OpenAI API Key <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: "#4f8ef7", fontSize: 11 }}>Get key →</a></Label>
            {field("openai_api_key", "Paste OpenAI API key...", true)}
            <Label>Mailmeteor Google Sheet URL</Label>
            {field("mailmeteor_sheet_url", "Paste Google Sheet URL...")}
            <Label>Gmail Address</Label>
            {field("gmail_address", "you@gmail.com")}
          </div>
        </div>
        {msg && <div style={{ padding: "10px 14px", background: "#1a2d1a", border: "1px solid #38c9a055", borderRadius: 7, fontSize: 13, color: "#38c9a0", marginTop: 12 }}>{msg}</div>}
        <BtnRow><Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Configuration"}</Btn></BtnRow>
      </Card>
      <Card title="📖 What each key does">
        {[
          { key: "🔍 Apollo.io", desc: "Find CBAM/ESG decision-makers by title, country, company size." },
          { key: "📧 Hunter.io", desc: "Find and verify email addresses for contacts." },
          { key: "🤖 Apify", desc: "LinkedIn scraping for supplemental prospecting." },
          { key: "✍️ OpenAI", desc: "Powers AI message generation in Generate tab (GPT-4o-mini)." },
          { key: "📊 Mailmeteor", desc: "Bulk personalised email sending via Google Sheet." },
          { key: "📧 Gmail", desc: "Used as reply-to and sender address for mass email." },
        ].map(({ key, desc }) => (
          <div key={key} style={{ padding: "8px 0", borderBottom: "1px solid #2a3348", fontSize: 13 }}>
            <strong style={{ color: "#e8ecf4" }}>{key}</strong>
            <span style={{ color: "#7a8ba6", marginLeft: 8 }}>{desc}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
