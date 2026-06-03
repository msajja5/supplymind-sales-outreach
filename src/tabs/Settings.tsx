import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif', maxWidth: 680 },
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
  free: { background: '#1a3020', color: '#38c9a0', border: '1px solid #38c9a055' } as React.CSSProperties,
  paid: { background: '#1a1a30', color: '#7a8ba6', border: '1px solid #2a3348' } as React.CSSProperties,
};

type CfgKey = 'hunter_api_key' | 'apollo_api_key' | 'resend_api_key' | 'groq_api_key' | 'apify_api_key' | 'from_email' | 'from_name';

export default function Settings() {
  const [cfg, setCfg] = useState<Record<CfgKey, string>>({
    hunter_api_key: '', apollo_api_key: '', resend_api_key: '',
    groq_api_key: '', apify_api_key: '', from_email: '', from_name: '',
  });
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tool_configs').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setCfg({
      hunter_api_key: data.hunter_api_key || '',
      apollo_api_key: data.apollo_api_key || '',
      resend_api_key: data.resend_api_key || '',
      groq_api_key: data.groq_api_key || '',
      apify_api_key: data.apify_api_key || '',
      from_email: data.from_email || '',
      from_name: data.from_name || '',
    });
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('tool_configs').upsert(
      { user_id: user.id, ...cfg }, { onConflict: 'user_id' }
    );
    if (error) { setMsg(error.message); setIsErr(true); }
    else { setMsg('Settings saved!'); setIsErr(false); }
    setTimeout(() => setMsg(''), 5000);
  };

  const set = (k: CfgKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg(p => ({ ...p, [k]: e.target.value }));

  const Field = ({ label, cfgKey, hint, placeholder, type = 'text', free }: { label: string; cfgKey: CfgKey; hint: string; placeholder: string; type?: string; free?: boolean }) => (
    <div>
      <label style={s.label}>
        {label}
        <span style={{ ...s.badge, ...(free ? s.free : s.paid) }}>{free ? 'FREE' : 'PAID'}</span>
      </label>
      <input style={s.input} value={cfg[cfgKey]} onChange={set(cfgKey)} placeholder={placeholder} type={type} />
      <div style={s.hint}>{hint}</div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: '#e8ecf4' }}>Settings</h2>
      <p style={{ fontSize: 13, color: '#4a5a6a', marginBottom: 24 }}>Configure API keys and sender identity. All keys stored securely per user.</p>

      {msg && <div style={isErr ? s.err : s.ok}>{msg}</div>}

      <div style={s.card}>
        <div style={s.title}>Email Sender Identity</div>
        <div style={s.sub}>Shown to recipients in outreach emails. Set this before sending any campaign.</div>
        <div style={s.label}>Display Name (shown to recipient)</div>
        <input style={s.input} value={cfg.from_name} onChange={set('from_name')} placeholder="Manjunath @ SupplyMind AI" />
        <div style={s.hint}>Example: Manjunath @ SupplyMind AI</div>
        <div style={s.label}>From Email Address</div>
        <input style={s.input} type="email" value={cfg.from_email} onChange={set('from_email')} placeholder="you@yourdomain.com" />
        <div style={s.hint}>Must be a verified domain in Resend. Leave blank to use onboarding@resend.dev (test-only, delivers to your own email only).</div>
      </div>

      <div style={s.card}>
        <Field label="Hunter.io API Key" cfgKey="hunter_api_key" free placeholder="Paste Hunter.io API key" type="password" hint="hunter.io/api-keys - free plan: 25 searches/month. Powers Find Leads and email enrichment." />
      </div>

      <div style={s.card}>
        <Field label="Resend API Key" cfgKey="resend_api_key" free placeholder="re_xxxxxxxx" type="password" hint="resend.com/api-keys - free 3,000 emails/month. Required to send real outreach emails. Without it, emails are logged only." />
      </div>

      <div style={s.card}>
        <Field label="Apollo.io API Key" cfgKey="apollo_api_key" placeholder="Paste Apollo API key" type="password" hint="app.apollo.io/settings/integrations/api - paid plan required to unlock email data." />
      </div>

      <div style={s.card}>
        <Field label="Groq API Key" cfgKey="groq_api_key" free placeholder="gsk_xxxxxxxx" type="password" hint="console.groq.com/keys - free. Powers AI message generation in the Generate tab." />
      </div>

      <button style={s.btn} onClick={save}>Save All Settings</button>
    </div>
  );
}
