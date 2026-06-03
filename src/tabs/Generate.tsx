import { useState } from 'react';
import { supabase } from '../lib/supabase';

const CHANNELS = [
  { value: 'email', label: 'Cold email' },
  { value: 'linkedin', label: 'LinkedIn note' },
  { value: 'followup', label: 'Follow-up email' },
  { value: 'value', label: 'Value-add message' },
];
const GOALS = [
  { value: 'demo', label: 'Book a demo' },
  { value: 'reply', label: 'Get a reply' },
  { value: 'intro', label: 'Warm intro / awareness' },
  { value: 'feedback', label: 'Ask for feedback' },
];

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  stat: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 10, padding: '16px 20px', textAlign: 'center' as const },
  statN: { fontSize: 28, fontWeight: 700, color: '#4f8ef7' },
  statL: { fontSize: 12, color: '#7a8ba6', marginTop: 2 },
  statSub: { fontSize: 11, color: '#4a5a6a' },
  card: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 12, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#e8ecf4', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: '#7a8ba6', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 12 },
  select: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 12 },
  textarea: { width: '100%', padding: '10px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, minHeight: 80, resize: 'vertical' as const },
  btn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
  btnSm: { padding: '8px 14px', borderRadius: 7, border: 'none', background: '#1e2d45', color: '#e8ecf4', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  btnG: { padding: '8px 14px', borderRadius: 7, border: 'none', background: '#38c9a0', color: '#0a0f18', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  outputBox: { width: '100%', padding: '12px', background: '#060d18', border: '1px solid #1e2d45', borderRadius: 8, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, minHeight: 140, resize: 'vertical' as const, lineHeight: 1.6 },
  row: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' as const },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  err: { color: '#e74c3c', fontSize: 13, padding: '8px 12px', background: '#1a0f0f', borderRadius: 7, border: '1px solid #c0392b44', marginBottom: 12 },
};

export default function Generate() {
  const [firstName, setFirstName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [country, setCountry] = useState('');
  const [channel, setChannel] = useState('email');
  const [hook, setHook] = useState('');
  const [goal, setGoal] = useState('demo');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ contacts: 0, touchpoints: 0, replies: 0, demos: 0 });

  const generate = async () => {
    setLoading(true);
    setOutput('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ channel, name: firstName, company, role, hook, goal }),
      });
      const d = await r.json();
      setOutput(d.message || d.error || 'No response received.');
    } catch (e: any) {
      setOutput('Error: ' + (e?.message || String(e)));
    }
    setLoading(false);
  };

  const logActivity = async (type: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: 'log_activity', type, company, first_name: firstName, note: output.slice(0, 200) }),
    });
  };

  return (
    <div style={s.wrap}>
      <div style={s.stats}>
        {[['Contacts','in pipeline',stats.contacts],['Touchpoints','sent',stats.touchpoints],['Replies','received',stats.replies],['Demos','booked 🎉',stats.demos]].map(([l,sub,n]) => (
          <div key={String(l)} style={s.stat}>
            <div style={s.statN}>{n}</div>
            <div style={s.statL}>{l}</div>
            <div style={s.statSub}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>🤖 AI Message Generator</div>
        <div style={s.grid}>
          <div>
            <label style={s.label}>First name</label>
            <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Anna" />
            <label style={s.label}>Company</label>
            <input style={s.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="Siemens" />
            <label style={s.label}>Role</label>
            <input style={s.input} value={role} onChange={e => setRole(e.target.value)} placeholder="Head of Sustainability" />
            <label style={s.label}>Country</label>
            <input style={s.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Germany" />
          </div>
          <div>
            <label style={s.label}>Channel</label>
            <select style={s.select} value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label style={s.label}>Recent activity / hook (optional)</label>
            <textarea style={{ ...s.textarea, marginBottom: 12 }} value={hook} onChange={e => setHook(e.target.value)} placeholder="e.g. They posted about CBAM readiness last week..." />
            <label style={s.label}>Goal</label>
            <select style={s.select} value={goal} onChange={e => setGoal(e.target.value)}>
              {GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
        <button style={s.btn} onClick={generate} disabled={loading}>
          {loading ? '⏳ Generating...' : '🤖 Generate Message'}
        </button>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Generated Message</div>
        <textarea style={s.outputBox} value={output} onChange={e => setOutput(e.target.value)} placeholder="Your AI-generated message will appear here..." />
        <div style={s.row}>
          <button style={s.btnSm} onClick={() => navigator.clipboard.writeText(output)}>📋 Copy</button>
          <button style={s.btnG} onClick={() => logActivity('LinkedIn')}>✅ Log LinkedIn Sent</button>
          <button style={s.btnG} onClick={() => logActivity('Email')}>✅ Log Email Sent</button>
          <button style={s.btnSm} onClick={generate}>🔄 Regenerate</button>
        </div>
      </div>
    </div>
  );
}
