import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Contact {
  id?: string; first_name: string; last_name: string;
  company: string; role: string; email: string;
  linkedin_url: string; country: string; source: string; status?: string;
}

const s: Record<string, React.CSSProperties> = {
  wrap: { color: '#e8ecf4', fontFamily: 'Inter, sans-serif' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  stat: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 10, padding: '16px 20px', textAlign: 'center' as const },
  statN: { fontSize: 28, fontWeight: 700, color: '#4f8ef7' },
  statL: { fontSize: 12, color: '#7a8ba6', marginTop: 2 },
  statS: { fontSize: 11, color: '#4a5a6a' },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const },
  tab: { padding: '8px 14px', borderRadius: 8, border: '1px solid #2a3348', background: 'transparent', color: '#7a8ba6', cursor: 'pointer', fontSize: 13 },
  tabA: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  card: { background: '#0d1525', border: '1px solid #1e2d45', borderRadius: 12, padding: 22, marginBottom: 14 },
  cardT: { fontSize: 15, fontWeight: 700, color: '#e8ecf4', marginBottom: 14 },
  err: { background: '#1a0f0f', border: '1px solid #c0392b55', borderRadius: 8, padding: '10px 14px', color: '#e74c3c', fontSize: 13, marginBottom: 12 },
  ok: { background: '#0f1a10', border: '1px solid #38c9a055', borderRadius: 8, padding: '10px 14px', color: '#38c9a0', fontSize: 13, marginBottom: 12 },
  warn: { background: '#1a1200', border: '1px solid #f59e0b55', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12, color: '#7a8ba6', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, marginBottom: 10 },
  textarea: { width: '100%', padding: '9px 12px', background: '#0a0f18', border: '1px solid #2a3348', borderRadius: 7, color: '#e8ecf4', fontSize: 13, boxSizing: 'border-box' as const, minHeight: 110, resize: 'vertical' as const, marginBottom: 10 },
  btn: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnG: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#38c9a0', color: '#0a0f18', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnA: { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#0a0f18', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSm: { padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1e2d45', color: '#e8ecf4', cursor: 'pointer', fontSize: 12 },
  chip: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, border: '1px solid #2a3348', fontSize: 12, cursor: 'pointer', margin: '0 4px 4px 0', userSelect: 'none' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  th: { padding: '8px 10px', textAlign: 'left' as const, color: '#7a8ba6', borderBottom: '1px solid #1e2d45', fontSize: 11 },
  td: { padding: '7px 10px', borderBottom: '1px solid #0f1830', color: '#e8ecf4' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

const JOB_TITLES = ['Head of Sustainability','CBAM Manager','ESG Director','Trade Compliance Manager','Sustainability Manager','VP ESG','Chief Sustainability Officer','Head of Trade Finance','Climate Director','Carbon Accounting Manager'];
const COUNTRIES = ['Netherlands','Belgium','Germany','France','Denmark','Sweden','Austria','Switzerland','Spain','Italy','Poland','Finland'];
const TABS = ['\ud83d\udd0d Find Leads','\ud83d\udce4 Upload CSV','\ud83d\udce7 Mass Email','\u23f0 Follow-up Sequences'];

const SUBJECT_DEFAULT = 'Quick question about CBAM compliance \u2014 SupplyMind AI';
const BODY_DEFAULT = [
  'Hi {{first_name}},',
  '',
  'Managing CBAM compliance across dozens of suppliers is a growing operational burden for companies like {{company}}.',
  '',
  'SupplyMind AI automates the entire process \u2014 supplier data collection, carbon calculations, and CBAM report generation \u2014 saving your team weeks of manual work.',
  '',
  'Would it make sense to spend 20 minutes exploring how this could work for {{company}}?',
  '',
  'Best,',
  'Manjunath',
  'SupplyMind AI | supplymindai.com',
].join('\n');

const HUNTER_PLACEHOLDER = 'Siemens\nBASF\nPhilips\nSAP\nThyssenKrupp\nRWE\nE.ON\nLinde';
const CSV_HINT = 'first_name, last_name, company, role, email, country, linkedin_url';

export default function Outreach() {
  const [tab, setTab] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pipeline: 0, emails: 0, seqs: 0, missing: 0 });
  const [titles, setTitles] = useState(['Head of Sustainability','CBAM Manager','ESG Director']);
  const [countries, setCountries] = useState(['Netherlands','Belgium','Germany','France']);
  const [hunterCompanies, setHunterCompanies] = useState('');
  const [subject, setSubject] = useState(SUBJECT_DEFAULT);
  const [bodyText, setBodyText] = useState(BODY_DEFAULT);
  const [fromName, setFromName] = useState('Manjunath @ SupplyMind AI');
  const [csvPreview, setCsvPreview] = useState<Contact[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: cts }, { count: emails }, { count: seqs }] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['sent','logged']),
      supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    ]);
    if (cts) {
      setContacts(cts);
      setStats({ pipeline: cts.length, emails: emails || 0, seqs: seqs || 0, missing: cts.filter(c => !c.email).length });
    }
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

  const notify = (text: string, err = false) => { setMsg(text); setIsErr(err); setTimeout(() => setMsg(''), 7000); };
  const toggleTitle = (t: string) => setTitles(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleCountry = (c: string) => setCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const toggleSel = (id: string) => setSelIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAll = () => setSelIds(new Set(contacts.map(c => c.id!).filter(Boolean)));
  const selNone = () => setSelIds(new Set());
  const selWithEmail = () => setSelIds(new Set(contacts.filter(c => c.email && c.id).map(c => c.id!)));

  const doApollo = async () => {
    if (!titles.length || !countries.length) return notify('Select at least one title and country', true);
    setLoading(true);
    const d = await call('apollo_search', { titles, countries });
    if (d.error) { notify(d.error, true); setLoading(false); return; }
    const imp = await call('import_contacts', { contacts: d.people || [] });
    notify(`Apollo: found ${d.people?.length || 0}, imported ${imp.imported || 0} new contacts`);
    await loadAll(); setLoading(false);
  };

  const doHunter = async () => {
    const companies = hunterCompanies.split('\n').map((c: string) => c.trim()).filter(Boolean);
    if (!companies.length) return notify('Enter at least one company name', true);
    setLoading(true);
    const d = await call('hunter_find_people', { companies, titles });
    if (d.error) { notify(d.error, true); setLoading(false); return; }
    const imp = await call('import_contacts', { contacts: d.people || [] });
    notify(`Hunter: found ${d.people?.length || 0} contacts with emails, imported ${imp.imported || 0} new`);
    await loadAll(); setLoading(false);
  };

  const doHunterEnrich = async () => {
    setLoading(true);
    const d = await call('hunter_enrich_pipeline');
    if (d.error) { notify(d.error, true); } else { notify(`Hunter enriched ${d.enriched || 0} / ${d.total_missing || 0} contacts with emails`); }
    await loadAll(); setLoading(false);
  };

  const parseCsv = (text: string): Contact[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return {
        first_name: row.first_name || row.firstname || row.first || '',
        last_name: row.last_name || row.lastname || row.last || '',
        company: row.company || row.organization || row.company_name || '',
        role: row.role || row.title || row.job_title || row.position || '',
        email: row.email || row.email_address || '',
        linkedin_url: row.linkedin || row.linkedin_url || '',
        country: row.country || row.location || '',
        source: 'csv',
      };
    }).filter(c => c.first_name || c.email || c.company);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setCsvPreview(parsed);
      notify(`Parsed ${parsed.length} rows. Click Import to save.`);
    };
    reader.readAsText(file);
  };

  const doImportCsv = async () => {
    if (!csvPreview.length) return notify('No CSV data to import', true);
    setLoading(true);
    const d = await call('import_contacts', { contacts: csvPreview });
    if (d.error) { notify(d.error, true); } else { notify(`Imported ${d.imported} contacts from CSV`); setCsvPreview([]); }
    await loadAll(); setLoading(false);
  };

  const doMassEmail = async () => {
    const ids = Array.from(selIds);
    if (!ids.length) return notify('Select contacts first', true);
    setLoading(true);
    const d = await call('send_mass_email', { contact_ids: ids, subject, body_template: bodyText, from_name: fromName });
    if (d.error) { notify(d.error, true); }
    else if (d.note) { notify(`${d.logged || 0} emails logged. ${d.note}`); }
    else { notify(`✓ Sent ${d.sent} emails!`); }
    await loadAll(); setLoading(false);
  };

  const doSchedule = async () => {
    const ids = Array.from(selIds);
    if (!ids.length) return notify('Select contacts first', true);
    setLoading(true);
    const d = await call('schedule_followups', { contact_ids: ids });
    if (d.error) { notify(d.error, true); } else { notify(`Created ${d.sequences_created} follow-up sequences`); }
    await loadAll(); setLoading(false);
  };

  const Chips = ({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div style={{ marginBottom: 12 }}>
      {items.map(t => (
        <span key={t} style={{ ...s.chip, background: selected.includes(t) ? '#1a3060' : '#0a0f18', color: selected.includes(t) ? '#4f8ef7' : '#7a8ba6', borderColor: selected.includes(t) ? '#4f8ef7' : '#2a3348' }} onClick={() => onToggle(t)}>{t}</span>
      ))}
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.grid4}>
        {([['Pipeline', stats.pipeline, 'total contacts'], ['Emails', stats.emails, 'sent / logged'], ['Sequences', stats.seqs, 'active drips'], ['Missing Email', stats.missing, 'need enriching']] as [string, number, string][]).map(([l, n, sub]) => (
          <div key={l} style={s.stat}>
            <div style={{ ...s.statN, color: l === 'Missing Email' && n > 0 ? '#f59e0b' : '#4f8ef7' }}>{n}</div>
            <div style={s.statL}>{l}</div><div style={s.statS}>{sub}</div>
          </div>
        ))}
      </div>

      {stats.missing > 0 && (
        <div style={s.warn}>
          <span style={{ fontSize: 13, color: '#f59e0b' }}>\u26a0\ufe0f {stats.missing} contacts missing email \u2014 use Hunter to find them</span>
          <button style={{ ...s.btnA, padding: '6px 14px', fontSize: 12 }} onClick={doHunterEnrich} disabled={loading}>{loading ? 'Finding...' : '\ud83d\udd0d Find Emails (Hunter)'}</button>
        </div>
      )}

      <div style={s.tabs}>
        {TABS.map((t, i) => <button key={t} style={i === tab ? s.tabA : s.tab} onClick={() => setTab(i)}>{t}</button>)}
      </div>

      {msg && <div style={isErr ? s.err : s.ok}>{msg}</div>}

      {tab === 0 && (
        <div>
          <div style={s.card}>
            <div style={s.cardT}>\ud83c\udf0d Hunter.io \u2014 Find Leads by Company (FREE \u2713 Recommended)</div>
            <label style={s.label}>Target company names, one per line</label>
            <textarea style={s.textarea} value={hunterCompanies} onChange={e => setHunterCompanies(e.target.value)} placeholder={HUNTER_PLACEHOLDER} />
            <label style={s.label}>Filter by job title (optional)</label>
            <Chips items={JOB_TITLES} selected={titles} onToggle={toggleTitle} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={s.btnA} onClick={doHunter} disabled={loading}>{loading ? 'Searching Hunter...' : '\ud83d\udd0d Search Hunter.io'}</button>
              <span style={{ fontSize: 12, color: '#4a5a6a' }}>Finds verified work emails automatically</span>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardT}>\ud83d\ude80 Apollo.io \u2014 Search by Role + Country (needs paid plan)</div>
            <label style={s.label}>Job titles</label>
            <Chips items={JOB_TITLES} selected={titles} onToggle={toggleTitle} />
            <label style={s.label}>Countries</label>
            <Chips items={COUNTRIES} selected={countries} onToggle={toggleCountry} />
            <button style={s.btn} onClick={doApollo} disabled={loading}>{loading ? 'Searching...' : 'Search Apollo'}</button>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={s.card}>
          <div style={s.cardT}>\ud83d\udcc2 Upload Contact List (CSV)</div>
          <p style={{ color: '#7a8ba6', fontSize: 13, marginBottom: 6 }}>Upload a CSV exported from LinkedIn Sales Navigator, Apollo, or any tool.</p>
          <p style={{ color: '#4a5a6a', fontSize: 12, marginBottom: 14 }}>Columns auto-detected: <code style={{ color: '#4f8ef7' }}>{CSV_HINT}</code></p>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button style={s.btn} onClick={() => fileRef.current?.click()}>\ud83d\udcc1 Choose CSV File</button>
            {csvPreview.length > 0 && (
              <button style={s.btnG} onClick={doImportCsv} disabled={loading}>
                {loading ? 'Importing...' : `\u2713 Import ${csvPreview.length} Contacts`}
              </button>
            )}
          </div>
          {csvPreview.length > 0 && (
            <div style={{ overflowX: 'auto' as const, maxHeight: 280, overflowY: 'auto' as const }}>
              <table style={s.table}>
                <thead><tr><th style={s.th}>Name</th><th style={s.th}>Company</th><th style={s.th}>Role</th><th style={s.th}>Email</th><th style={s.th}>Country</th></tr></thead>
                <tbody>{csvPreview.slice(0, 20).map((c, i) => (
                  <tr key={i}>
                    <td style={s.td}>{c.first_name} {c.last_name}</td>
                    <td style={s.td}>{c.company}</td>
                    <td style={s.td}>{c.role}</td>
                    <td style={s.td}>{c.email || <span style={{ color: '#f59e0b' }}>\u2014</span>}</td>
                    <td style={s.td}>{c.country}</td>
                  </tr>
                ))}</tbody>
              </table>
              {csvPreview.length > 20 && <div style={{ color: '#4a5a6a', fontSize: 12, padding: 8 }}>...and {csvPreview.length - 20} more rows</div>}
            </div>
          )}
        </div>
      )}

      {tab === 2 && (
        <div style={s.card}>
          <div style={s.cardT}>\ud83d\udce7 Mass Personalised Email Campaign</div>
          <div style={s.row2}>
            <div>
              <label style={s.label}>Sender name</label>
              <input style={s.input} value={fromName} onChange={e => setFromName(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Subject line</label>
              <input style={s.input} value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          </div>
          <label style={s.label}>Email body \u2014 tokens: {'{{first_name}}'}, {'{{company}}'}, {'{{role}}'}</label>
          <textarea style={{ ...s.textarea, minHeight: 220 }} value={bodyText} onChange={e => setBodyText(e.target.value)} />
          <div style={{ background: '#0a1020', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#4a5a6a' }}>
            \u2139\ufe0f Add <strong style={{ color: '#4f8ef7' }}>Resend API key</strong> in Settings to send real emails (free 3,000/month at resend.com). Without it, emails are logged for tracking.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' as const, alignItems: 'center' }}>
            <button style={s.btnSm} onClick={selAll}>All ({contacts.length})</button>
            <button style={s.btnSm} onClick={selWithEmail}>With Email ({contacts.filter(c => c.email).length})</button>
            <button style={s.btnSm} onClick={selNone}>None</button>
            <span style={{ fontSize: 13, color: '#7a8ba6' }}>{selIds.size} selected</span>
          </div>
          <button style={s.btnG} onClick={doMassEmail} disabled={loading || !selIds.size}>
            {loading ? 'Sending...' : `\ud83d\udce4 Send Campaign to ${selIds.size} Contacts`}
          </button>
        </div>
      )}

      {tab === 3 && (
        <div style={s.card}>
          <div style={s.cardT}>\u23f0 Schedule Follow-up Sequences</div>
          <p style={{ color: '#7a8ba6', fontSize: 13, marginBottom: 14 }}>4-touch drip: LinkedIn (day 0) \u2192 Follow-up (day 3) \u2192 Cold email (day 7) \u2192 Final nudge (day 14).</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button style={s.btnSm} onClick={selAll}>All ({contacts.length})</button>
            <button style={s.btnSm} onClick={selNone}>None</button>
            <span style={{ fontSize: 13, color: '#7a8ba6' }}>{selIds.size} selected</span>
          </div>
          <button style={s.btn} onClick={doSchedule} disabled={loading || !selIds.size}>
            {loading ? 'Scheduling...' : `\u23f0 Schedule ${selIds.size} Sequences`}
          </button>
        </div>
      )}

      {contacts.length > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={s.cardT}>Contact Pipeline ({contacts.length})</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btnSm} onClick={selAll}>All</button>
              <button style={s.btnSm} onClick={selWithEmail}>With Email</button>
              <button style={s.btnSm} onClick={selNone}>None</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' as const, maxHeight: 420, overflowY: 'auto' as const }}>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}></th><th style={s.th}>Name</th><th style={s.th}>Company</th>
                <th style={s.th}>Role</th><th style={s.th}>Email</th><th style={s.th}>Country</th><th style={s.th}>Source</th>
              </tr></thead>
              <tbody>{contacts.map(c => (
                <tr key={c.id} style={{ background: selIds.has(c.id!) ? '#0d1f3c' : 'transparent' }}>
                  <td style={s.td}><input type="checkbox" checked={selIds.has(c.id!)} onChange={() => toggleSel(c.id!)} /></td>
                  <td style={s.td}>{c.first_name} {c.last_name}</td>
                  <td style={s.td}>{c.company}</td>
                  <td style={s.td}>{c.role}</td>
                  <td style={s.td}>{c.email ? <span style={{ color: '#38c9a0' }}>{c.email}</span> : <span style={{ color: '#f59e0b', fontSize: 11 }}>\u26a0 missing</span>}</td>
                  <td style={s.td}>{c.country}</td>
                  <td style={s.td}><span style={{ fontSize: 10, background: '#1e2d45', padding: '2px 7px', borderRadius: 10 }}>{c.source}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
