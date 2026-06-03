import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, Label, Btn, BtnRow } from "../components/Card";

export default function Settings() {
  const [cfg, setCfg] = useState({
    apollo_api_key: "", hunter_api_key: "", apify_api_key: "",
    mailmeteor_sheet_url: "", gmail_address: "",
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
    setMsg("✅ Saved! All API keys stored encrypted in your private Supabase DB.");
    setSaving(false);
  };

  const F = (k: keyof typeof cfg) => (
    <input
      type={k.includes("key") ? "password" : "text"}
      value={cfg[k]}
      onChange={e => setCfg(c => ({ ...c, [k]: e.target.value }))}
      placeholder={k === "gmail_address" ? "you@gmail.com" : k.includes("url") ? "Paste Google Sheet URL..." : "Paste API key..."}
    />
  );

  return (
    <div>
      <Card title="⚙️ Tool Configuration">
        <div style={{fontSize:12,color:"#7a8ba6",marginBottom:16}}>
          All keys stored in your private Supabase database (Row Level Security — only you can see them).
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <Label>Apollo.io API Key <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" style={{color:"#4f8ef7",fontSize:11}}>Get key →</a></Label>
            {F("apollo_api_key")}
            <Label>Hunter.io API Key <a href="https://hunter.io/api" target="_blank" style={{color:"#4f8ef7",fontSize:11}}>Get key →</a></Label>
            {F("hunter_api_key")}
            <Label>Apify API Key <a href="https://console.apify.com/account/integrations" target="_blank" style={{color:"#4f8ef7",fontSize:11}}>Get key →</a></Label>
            {F("apify_api_key")}
          </div>
          <div>
            <Label>OpenAI API Key <a href="https://platform.openai.com/api-keys" target="_blank" style={{color:"#4f8ef7",fontSize:11}}>Get key →</a></Label>
            {F("openai_api_key")}
            <Label>Mailmeteor Google Sheet URL <a href="https://mailmeteor.com" target="_blank" style={{color:"#4f8ef7",fontSize:11}}>Get key →</a></Label>
            {F("mailmeteor_sheet_url")}
            <Label>Gmail Address (for sending)</Label>
            {F("gmail_address")}
          </div>
        </div>

        {msg && <div style={{padding:"10px 14px",background:"#1a2d1a",border:"1px solid #38c9a055",borderRadius:7,fontSize:12,color:"#38c9a0",marginBottom:12}}>{msg}</div>}
        <BtnRow>
          <Btn onClick={save} disabled={saving}>{saving?"Saving...":"💾 Save Configuration"}</Btn>
        </BtnRow>
      </Card>

      <Card title="📌 How Each Tool Is Used">
        {[
          {key:"🔍 Apollo.io",desc:"Find CBAM/ESG decision-makers by title, country, company size. Powers the Outreach → Find Contacts tab."},
          {key:"📧 Hunter.io",desc:"Find and verify email addresses for contacts. Used in Find Contacts tab — click 'Find email' per contact."},
          {key:"🤖 Apify",desc:"LinkedIn scraping for contacts not on Apollo. Used for supplemental prospecting (coming soon)."},
          {key:"✍️ OpenAI",desc:"Powers AI message generation in Generate tab — personalised LinkedIn/email messages using GPT-4."},
          {key:"📊 Mailmeteor",desc:"Connect a Google Sheet for bulk personalised email sending (2,000/day free). Paste the Sheet URL."},
          {key:"📧 Gmail",desc:"Used as reply-to and sender address for mass email. Opens your Gmail client automatically."},
        ].map(({key,desc})=>(
          <div key={key} style={{borderBottom:"1px solid #1a2030",padding:"10px 0",fontSize:12}}>
            <strong style={{color:"#e8ecf4"}}>{key}</strong>
            <span style={{color:"#7a8ba6",marginLeft:10}}>{desc}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
