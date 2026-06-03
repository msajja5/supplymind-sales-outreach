import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif', maxWidth: 600 },
  card: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 12, padding: 24, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  label: { fontSize: 12, color: '#7a8ba6', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 12 },
  btn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  ok: { background: '#0f1a10', border: '1px solid #38c9a055', borderRadius: 8, padding: '10px 14px', color: '#38c9a0', fontSize: 13, marginBottom: 14 },
  err: { background: '#1a0f0f', border: '1px solid #c0392b55', borderRadius: 8, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 14 },
  hint: { fontSize: 11, color: '#4a5a6a', marginTop: -8, marginBottom: 12 },
};

export default function Settings() {
  const [cfg, setCfg] = useState({ apollo_api_key: '', apify_api_key: '', groq_api_key: '', hunter_api_key: '' });
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('tool_configs').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setCfg({ apollo_api_key: data.apollo_api_key || '', apify_api_key: data.apify_api_key || '', groq_api_key: data.groq_api_key || '', hunter_api_key: data.hunter_api_key || '' });
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('tool_configs').upsert({ user_id: user.id, ...cfg }, { onConflict: 'user_id' });
    if (error) { setMsg(error.message); setIsErr(true); }
    else { setMsg('Saved!'); setIsErr(false); }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div style={s.wrap}>
      {msg && <div style={isErr ? s.err : s.ok}>{msg}</div>}
      <div style={s.card}>
        <div style={s.title}>API Keys</div>
        <label style={s.label}>Groq API Key (free AI messages)</label>
        <input style={s.input} type="password" value={cfg.groq_api_key} onChange={e => setCfg(p => ({ ...p, groq_api_key: e.target.value }))} placeholder="gsk_..." />
        <div style={s.hint}>Free at console.groq.com/keys — 14,400 requests/day</div>
        <label style={s.label}>Apollo.io API Key (contact search)</label>
        <input style={s.input} type="password" value={cfg.apollo_api_key} onChange={e => setCfg(p => ({ ...p, apollo_api_key: e.target.value }))} placeholder="Apollo key..." />
        <div style={s.hint}>Free plan: 50 credits/month at app.apollo.io</div>
        <label style={s.label}>Hunter.io API Key (email finder)</label>
        <input style={s.input} type="password" value={cfg.hunter_api_key} onChange={e => setCfg(p => ({ ...p, hunter_api_key: e.target.value }))} placeholder="Hunter key..." />
        <div style={s.hint}>Free plan: 25 searches/month at hunter.io — best for finding work emails</div>
        <label style={s.label}>Apify API Key (LinkedIn scraper)</label>
        <input style={s.input} type="password" value={cfg.apify_api_key} onChange={e => setCfg(p => ({ ...p, apify_api_key: e.target.value }))} placeholder="Apify key..." />
        <div style={s.hint}>Free plan at console.apify.com</div>
        <button style={s.btn} onClick={save}>Save Keys</button>
      </div>
    </div>
  );
}
