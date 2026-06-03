import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABS = ['Find Contacts', 'Individual Outreach', 'Mass Email', 'Schedule Follow-ups'];

interface Contact {
  id?: string;
  first_name: string;
  last_name: string;
  company: string;
  role: string;
  email: string;
  linkedin_url: string;
  country: string;
  source: string;
  status?: string;
}

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  stat: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 10, padding: '16px 20px', textAlign: 'center' as const },
  statN: { fontSize: 28, fontWeight: 700, color: '#4f8ef7' },
  statL: { fontSize: 12, color: '#7a8ba6', marginTop: 2 },
  statSub: { fontSize: 11, color: '#4a5a6a' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: { padding: '8px 16px', borderRadius: 8, border: '1px solid #2a3348', background: 'transparent', color: '#7a8ba6', cursor: 'pointer', fontSize: 13 },
  tabA: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  card: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 12, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#e8ecf4', marginBottom: 16 },
  err: { background: '#1a0f0f', border: '1px solid #c0392b55', borderRadius: 8, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 14 },
  ok: { background: '#0f1a10', border: '1px solid #38c9a055', borderRadius: 8, padding: '10px 14px', color: '#38c9a0', fontSize: 13, marginBottom: 14 },
  label: { fontSize: 12, color: '#7a8ba6', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 12 },
  textarea: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, minHeight: 90, resize: 'vertical' as const, marginBottom: 12 },
  btn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnG: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#38c9a0', color: '#0a0f18', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSm: { padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1e2d45', color: '#e8ecf4', cursor: 'pointer', fontSize: 12 },
  chip: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, border: '1px solid #2a3348', fontSize: 12, cursor: 'pointer', margin: '0 4px 4px 0', userSelect: 'none' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { padding: '8px 10px', textAlign: 'left' as const, color: '#7a8ba6', borderBottom: '1px solid #1e2d45', fontSize: 12 },
  td: { padding: '8px 10px', borderBottom: '1px solid #0f1830', color: '#e8ecf4' },
};

const JOB_TITLES = ['Head of Sustainability','CBAM Manager','ESG Director','Trade Compliance Manager','Sustainability Manager','VP ESG','Chief Sustainability Officer','Head of Trade Finance','Climate Director','Carbon Accounting Manager'];
const COUNTRIES = ['Netherlands','Belgium','Germany','France','Denmark','Sweden','Austria','Switzerland','Spain','Italy'];

export default function Outreach() {
  const [tab, setTab] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ found: 0, pipeline: 0, emails: 0, seqs: 0 });
  const [titles, setTitles] = useState<string[]>(['Head of Sustainability','CBAM Manager','ESG Director']);
  const [countries, setCountries] = useState<string[]>(['Netherlands','Belgium','Germany']);
  const [apifyUrls, setApifyUrls] = useState('');
  const [indivChannel, setIndivChannel] = useState('linkedin');
  const MASS_SUBJECT_DEFAULT = 'Quick question about CBAM readiness — SupplyMind AI';
  const MASS_BODY_DEFAULT = 'Hi {{first_name}},

Managing CBAM compliance across dozens of suppliers is becoming a real operational challenge for companies like {{company}}.

SupplyMind AI automates the entire process — supplier data collection, carbon calculations, and CBAM report generation.

Would it make sense to spend 20 minutes showing you how it works?

Best,
Manjunath
SupplyMind AI';
  const [massSubject, setMassSubject] = useState(MASS_SUBJECT_DEFAULT);
  const [massBody, setMassBody] = useState(MASS_BODY_DEFAULT);

  useEffect(() => { loadStats(); loadContacts(); }, []);

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ count: pipeline }, { count: emails }, { count: seqs }] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'sent'),
      supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    ]);
    setStats(st => ({ ...st, pipeline: pipeline || 0, emails: emails || 0, seqs: seqs || 0 }));
  };

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (data) setContacts(data);
  };

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outreach-engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action, ...extra }),
    });
    return r.json();
  };

  const notify = (text: string, err = false) => { setMsg(text); setIsErr(err); setTimeout(() => setMsg(''), 5000); };
  const toggleTitle = (t: string) => setTitles(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleCountry = (c: string) => setCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleSel = (id: string) => setSelIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAll = () => setSelIds(new Set(contacts.map(c => c.id!).filter(Boolean)));
  const selNone = () => setSelIds(new Set());

  const doApollo = async () => {
    if (!titles.length || !countries.length) return notify('Select at least one title and country', true);
    setLoading(true);
    const d = await call('apollo_search', { titles, countries });
    if (d.error) { notify(d.error, true); setLoading(false); return; }
    const imp = await call('import_contacts', { contacts: d.people || [] });
    setStats(st => ({ ...st, found: d.total || 0 }));
    notify(`Found ${d.people?.length || 0} contacts, imported ${imp.imported || 0} new to pipeline`);
    await loadContacts(); await loadStats();
    setLoading(false);
  };

  const doApify = async () => {
    const urls = apifyUrls.split('\n').map((u: string) => u.trim()).filter(Boolean);
    if (!urls.length) return notify('Paste at least one LinkedIn URL', true);
    setLoading(true);
    const d = await call('apify_scrape', { urls });
    if (d.error) { notify(d.error, true); setLoading(false); return; }
    const imp = await call('import_contacts', { contacts: d.people || [] });
    notify(`Scraped ${d.people?.length || 0} contacts, imported ${imp.imported || 0} new`);
    await loadContacts(); await loadStats();
    setLoading(false);
  };

  const doMassEmail = async () => {
    const ids = Array.from(selIds);
    if (!ids.length) return notify('Select contacts first', true);
    setLoading(true);
    const d = await call('send_mass_email', { contact_ids: ids, subject: massSubject, body_template: massBody });
    if (d.error) { notify(d.error, true); } else { notify(`Sent ${d.sent || 0} emails`); }
    await loadStats(); setLoading(false);
  };

  const doSchedule = async () => {
    const ids = Array.from(selIds);
    if (!ids.length) return notify('Select contacts first', true);
    setLoading(true);
    const d = await call('schedule_followups', { contact_ids: ids });
    if (d.error) { notify(d.error, true); } else { notify(`Created ${d.sequences_created || 0} sequences`); }
    await loadStats(); setLoading(false);
  };

  return (
    <div style={s.wrap}>
      <div style={s.stats}>
        <div style={s.stat}><div style={s.statN}>{stats.found}</div><div style={s.statL}>Found (Apollo)</div><div style={s.statSub}>this search</div></div>
        <div style={s.stat}><div style={s.statN}>{stats.pipeline}</div><div style={s.statL}>In Pipeline</div><div style={s.statSub}>total contacts</div></div>
        <div style={s.stat}><div style={s.statN}>{stats.emails}</div><div style={s.statL}>Emails Sent</div><div style={s.statSub}>logged</div></div>
        <div style={s.stat}><div style={s.statN}>{stats.seqs}</div><div style={s.statL}>Sequences</div><div style={s.statSub}>active</div></div>
      </div>

      <div style={s.tabs}>
        {TABS.map((t, i) => <button key={t} style={i === tab ? s.tabA : s.tab} onClick={() => setTab(i)}>{t}</button>)}
      </div>

      {msg && <div style={isErr ? s.err : s.ok}>{msg}</div>}

      {tab === 0 && (
        <div>
          <div style={s.card}>
            <div style={s.cardTitle}>Find Contacts — Apollo.io</div>
            <label style={s.label}>Job titles (click to toggle)</label>
            <div style={{ marginBottom: 12 }}>
              {JOB_TITLES.map(t => (
                <span key={t} style={{ ...s.chip, background: titles.includes(t) ? '#1a3060' : '#0a0f18', color: titles.includes(t) ? '#4f8ef7' : '#7a8ba6', borderColor: titles.includes(t) ? '#4f8ef7' : '#2a3348' }} onClick={() => toggleTitle(t)}>{t}</span>
              ))}
            </div>
            <label style={s.label}>Countries (click to toggle)</label>
            <div style={{ marginBottom: 16 }}>
              {COUNTRIES.map(c => (
                <span key={c} style={{ ...s.chip, background: countries.includes(c) ? '#1a3060' : '#0a0f18', color: countries.includes(c) ? '#4f8ef7' : '#7a8ba6', borderColor: countries.includes(c) ? '#4f8ef7' : '#2a3348' }} onClick={() => toggleCountry(c)}>{c}</span>
              ))}
            </div>
            <button style={s.btn} onClick={doApollo} disabled={loading}>{loading ? 'Searching...' : 'Search Apollo'}</button>
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>Apify — Scrape LinkedIn Companies</div>
            <label style={s.label}>Paste one LinkedIn company URL per line.</label>
            <textarea style={s.textarea} value={apifyUrls} onChange={e => setApifyUrls(e.target.value)} placeholder="https://www.linkedin.com/company/siemens" />
            <button style={{ ...s.btn, background: '#a855f7' }} onClick={doApify} disabled={loading}>{loading ? 'Scraping...' : 'Scrape via Apify'}</button>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Individual Outreach</div>
          <label style={s.label}>Channel</label>
          <select style={{ ...s.input }} value={indivChannel} onChange={e => setIndivChannel(e.target.value)}>
            <option value="linkedin">LinkedIn</option>
            <option value="email">Cold Email</option>
            <option value="followup">Follow-up</option>
          </select>
          <p style={{ color: '#7a8ba6', fontSize: 13 }}>Select contacts below, then use the Generate tab to craft personalised messages.</p>
        </div>
      )}

      {tab === 2 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Mass Email</div>
          <label style={s.label}>Subject</label>
          <input style={s.input} value={massSubject} onChange={e => setMassSubject(e.target.value)} />
          <label style={s.label}>Body (use {{'{'}}{{'}'}}first_name{{'}'}}{'}'}, {{'{'}}{{'{'}}company{{'}'}}{{'}'}})</label>
          <textarea style={{ ...s.textarea, minHeight: 160 }} value={massBody} onChange={e => setMassBody(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button style={s.btnSm} onClick={selAll}>Select All ({contacts.length})</button>
            <button style={s.btnSm} onClick={selNone}>Deselect All</button>
            <span style={{ fontSize: 13, color: '#7a8ba6', alignSelf: 'center' }}>{selIds.size} selected</span>
          </div>
          <button style={s.btnG} onClick={doMassEmail} disabled={loading || !selIds.size}>{loading ? 'Sending...' : 'Send Mass Email'}</button>
        </div>
      )}

      {tab === 3 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Schedule Follow-ups</div>
          <p style={{ color: '#7a8ba6', fontSize: 13, marginBottom: 16 }}>Creates a 4-touch sequence: LinkedIn (day 0) → Follow-up (day 3) → Email (day 7) → Final follow-up (day 14).</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button style={s.btnSm} onClick={selAll}>Select All ({contacts.length})</button>
            <button style={s.btnSm} onClick={selNone}>Deselect All</button>
            <span style={{ fontSize: 13, color: '#7a8ba6', alignSelf: 'center' }}>{selIds.size} selected</span>
          </div>
          <button style={s.btn} onClick={doSchedule} disabled={loading || !selIds.size}>{loading ? 'Scheduling...' : 'Schedule Follow-ups'}</button>
        </div>
      )}

      {contacts.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={s.cardTitle}>Pipeline ({contacts.length})</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btnSm} onClick={selAll}>All</button>
              <button style={s.btnSm} onClick={selNone}>None</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}></th><th style={s.th}>Name</th><th style={s.th}>Company</th><th style={s.th}>Role</th><th style={s.th}>Email</th><th style={s.th}>Country</th><th style={s.th}>Source</th>
              </tr></thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} style={{ background: selIds.has(c.id!) ? '#0d1f3c' : 'transparent' }}>
                    <td style={s.td}><input type="checkbox" checked={selIds.has(c.id!)} onChange={() => toggleSel(c.id!)} /></td>
                    <td style={s.td}>{c.first_name} {c.last_name}</td>
                    <td style={s.td}>{c.company}</td>
                    <td style={s.td}>{c.role}</td>
                    <td style={s.td}>{c.email || '—'}</td>
                    <td style={s.td}>{c.country}</td>
                    <td style={s.td}><span style={{ fontSize: 11, background: '#1e2d45', padding: '2px 7px', borderRadius: 10 }}>{c.source}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
