import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif', maxWidth: 640 },
  card: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 12, padding: 24, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#e8ecf4' },
  sub: { fontSize: 12, color: '#4a5a6a', marginBottom: 18 },
  label: { fontSize: 12, color: '#7a8ba6', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 4 },
  hint: { fontSize: 11, color: '#4a5a6a', marginBottom: 12 },
  btn: { padding: '9px 20px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  ok: { background: '#0f1a10', border: '1px solid #38c9a055', borderRadius: 8, padding: '10px 14px', color: '#38c9a0', fontSize: 13, marginBottom: 14 },
  err: { background: '#1a0f0f', border: '1px solid #c0392b55', borderRadius: 8, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 14 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, marginLeft: 8 },
  free: { background: '#1a3020', color: '#38c9a0', border: '1px solid #38c9a055' },
  paid: { background: '#1a1a30', color: '#7a8ba6', border: '1px solid #2a3348' },
};

export default function Settings() {
  const [cfg, setCfg] = useState({ groq_api_key: '', apollo_api_key: '', hunter_api_key: '', resend_api_key: '', apify_api_key: '' });
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tool_configs').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setCfg({ groq_api_key: data.groq_api_key || '', apollo_api_key: data.apollo_api_key || '', hunter_api_key: data.hunter_api_key || '', resend_api_key: data.resend_api_key || '', apify_api_key: data.apify_api_key || '' });
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('tool_configs').upsert({ user_id: user.id, ...cfg }, { onConflict: 'user_id' });
    if (error) { setMsg(error.message); setIsErr(true); } else { setMsg('Keys saved successfully!'); setIsErr(false); }
    setTimeout(() => setMsg(''), 4000);
  };

  const Field = ({ label, key_, hint, placeholder, free }: { label: string; key_: keyof typeof cfg; hint: string; placeholder: string; free?: boolean }) => (
    <div>
      <label style={s.label}>
        {label}
        <span style={{ ...s.badge, ...(free ? s.free : s.paid) }}>{free ? 'FREE' : 'OPTIONAL'}</span>
      </label>
      <input style={s.input} type="password" value={cfg[key_]} onChange={e => setCfg(p => ({ ...p, [key_]: e.target.value }))} placeholder={placeholder} />
      <div style={s.hint}>{hint}</div>
    </div>
  );

  return (
    <div style={s.wrap}>
      {msg && <div style={isErr ? s.err : s.ok}>{msg}</div>}
      <div style={s.card}>
        <div style={s.title}>API Keys for SupplyMind Outreach</div>
        <div style={s.sub}>These keys power lead finding, email discovery and sending. All marked FREE have generous free plans.</div>

        <Field label="Groq API Key (AI message generation)" key_="groq_api_key" hint="Free 14,400 req/day — get at console.groq.com/keys" placeholder="gsk_..." free />
        <Field label="Hunter.io API Key (find work emails)" key_="hunter_api_key" hint="Free 25 searches/month — get at hunter.io → API Keys" placeholder="Hunter key..." free />
        <Field label="Resend API Key (send emails)" key_="resend_api_key" hint="Free 3,000 emails/month — get at resend.com/api-keys" placeholder="re_..." free />
        <Field label="Apollo.io API Key (contact search)" key_="apollo_api_key" hint="Paid plan required for /people/search — app.apollo.io" placeholder="Apollo key..." />
        <Field label="Apify API Key (LinkedIn scraper)" key_="apify_api_key" hint="Optional — console.apify.com" placeholder="apify_api_..." />

        <button style={s.btn} onClick={save}>Save All Keys</button>
      </div>

      <div style={s.card}>
        <div style={s.title}>Quick Start Guide</div>
        <div style={s.sub}>Minimum setup to start finding and emailing leads:</div>
        <ol style={{ color: '#7a8ba6', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
          <li><strong style={{ color: '#e8ecf4' }}>Add Hunter.io key</strong> — finds verified work emails for any company</li>
          <li><strong style={{ color: '#e8ecf4' }}>Add Resend key</strong> — actually sends the emails to your leads</li>
          <li><strong style={{ color: '#e8ecf4' }}>Add Groq key</strong> — writes personalised AI messages per contact</li>
          <li>Go to <strong style={{ color: '#4f8ef7' }}>Outreach tab</strong> → Upload CSV or use Hunter Search to find leads</li>
          <li>Select contacts → click <strong style={{ color: '#e8ecf4' }}>Send Mass Email</strong></li>
        </ol>
      </div>
    </div>
  );
}
