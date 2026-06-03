import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Label, Btn, BtnRow, Grid2, StatBar } from '../components/Card';

const SUPABASE_URL: string = (import.meta as any).env.VITE_SUPABASE_URL;
const ANON_KEY: string = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const CBAM_TITLES = [
  'Head of Sustainability','CBAM Manager','ESG Director','Trade Compliance Manager',
  'Sustainability Manager','VP ESG','Chief Sustainability Officer','Head of Trade Finance',
  'Climate Director','Carbon Accounting Manager'
];
const COUNTRIES = [
  'Netherlands','Belgium','Germany','France','Denmark','Sweden','Austria','Switzerland','Spain','Italy'
];

type Contact = {
  first_name:string; last_name:string; company:string; role:string;
  email:string; linkedin_url:string; country:string; source?:string;
  email_confidence?:number;
};

export default function Outreach() {
  const [mode, setMode] = useState<'search'|'individual'|'mass'|'followup'>('search');
  const [results, setResults] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');
  const [stats, setStats] = useState({ found:0, imported:0, emailed:0, sequenced:0 });
  const [titles, setTitles] = useState(['Head of Sustainability','CBAM Manager','ESG Director']);
  const [countries, setCountries] = useState(['Netherlands','Belgium','Germany']);
  const [page, setPage] = useState(1);
  const [apifyUrls, setApifyUrls] = useState('');
  const [indiv, setIndiv] = useState<Contact>({ first_name:'',last_name:'',company:'',role:'',email:'',linkedin_url:'',country:'' });
  const [indivMsg, setIndivMsg] = useState('');
  const [indivChannel, setIndivChannel] = useState('linkedin');
  const [massSubject, setMassSubject] = useState('Quick question about CBAM readiness — SupplyMind AI');
  const [massBody, setMassBody] = useState('Hi {{first_name}},

Managing CBAM compliance across dozens of suppliers is becoming a real operational challenge for companies like {{company}}.

We built SupplyMind AI to automate this — supplier data collection, carbon calculations, and CBAM report generation.

Would a 20-min call this week make sense?

Best,
Manjunath
SupplyMind AI');
  const [fuTone, setFuTone] = useState('founder');
  const [fuPain, setFuPain] = useState('Manual CBAM tracking, 200+ suppliers');

  useEffect(() => { loadStats(); }, []);

  const callEngine = async (payload: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(SUPABASE_URL + '/functions/v1/outreach-engine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session?.access_token,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ count: imp }, { count: em }, { count: sq }] = await Promise.all([
      supabase.from('contacts').select('*',{count:'exact',head:true}).eq('user_id',user.id),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('user_id',user.id).eq('status','sent'),
      supabase.from('sequences').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    ]);
    setStats(s => ({ ...s, imported:imp||0, emailed:em||0, sequenced:sq||0 }));
  };

  const doSearch = async () => {
    setLoading(true);
    setLog('🔍 Searching Apollo.io...');
    const data = await callEngine({ action:'apollo_search', titles, countries, page });
    if (data.error) { setLog('❌ ' + data.error); setLoading(false); return; }
    setResults(data.people || []);
    setStats(s => ({ ...s, found: data.people?.length || 0 }));
    setLog('✅ Found ' + (data.people?.length || 0) + ' contacts (' + (data.total || 0) + ' total)');
    setLoading(false);
  };

  const doApify = async () => {
    const urls = apifyUrls.split('
').map((u:string)=>u.trim()).filter(Boolean);
    if (!urls.length) { setLog('⚠️ Paste LinkedIn company URLs first'); return; }
    setLoading(true);
    setLog('🤖 Scraping ' + urls.length + ' LinkedIn pages via Apify...');
    const data = await callEngine({ action:'apify_scrape', urls });
    if (data.error) { setLog('❌ ' + data.error); setLoading(false); return; }
    setResults(data.people || []);
    setStats(s => ({ ...s, found: data.people?.length || 0 }));
    setLog('✅ Scraped ' + (data.people?.length || 0) + ' contacts from LinkedIn');
    setLoading(false);
  };

  const verifyEmail = async (idx: number) => {
    const c = results[idx];
    setLog('🔍 Finding email for ' + c.first_name + '...');
    const domain = c.company.toLowerCase().replace(/s+/g,'').replace(/[^a-z0-9]/g,'') + '.com';
    const data = await callEngine({ action:'hunter_verify', domain, first_name:c.first_name, last_name:c.last_name });
    if (data.email) {
      const updated = [...results];
      updated[idx] = { ...c, email:data.email, email_confidence:data.score };
      setResults(updated);
      setLog('✅ Found: ' + data.email + ' (' + data.score + '% confidence)');
    } else { setLog('⚠️ Not found on Hunter.io'); }
  };

  const importSelected = async () => {
    const toImport = results.filter((_,i) => selected.has(String(i)));
    if (!toImport.length) { setLog('⚠️ Select contacts first'); return; }
    setLoading(true);
    setLog('📥 Importing ' + toImport.length + ' contacts...');
    const data = await callEngine({ action:'import_contacts', contacts:toImport });
    setLog('✅ Imported ' + data.imported + ' contacts to pipeline');
    await loadStats();
    setLoading(false);
  };

  const sendMass = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contacts } = await supabase.from('contacts').select('*').eq('user_id',user.id).neq('status','lost');
    const ids = (contacts||[]).filter((c:any)=>c.email).map((c:any)=>c.id);
    if (!ids.length) { setLog('⚠️ No contacts with emails. Import contacts first.'); return; }
    setLoading(true);
    setLog('📧 Sending to ' + ids.length + ' contacts...');
    const data = await callEngine({ action:'send_mass_email', contact_ids:ids, subject:massSubject, body_template:massBody });
    setLog('✅ Logged ' + data.sent + ' sends.');
    if (data.contacts?.length) {
      const emails = data.contacts.map((c:any)=>c.email).join(',');
      window.open('mailto:' + emails + '?subject=' + encodeURIComponent(massSubject) + '&body=' + encodeURIComponent(massBody), '_blank');
    }
    await loadStats();
    setLoading(false);
  };

  const scheduleFollowups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contacts } = await supabase.from('contacts').select('id').eq('user_id',user.id).eq('status','new');
    const ids = (contacts||[]).map((c:any)=>c.id);
    if (!ids.length) { setLog('⚠️ No new contacts. Import contacts first.'); return; }
    setLoading(true);
    setLog('🔁 Scheduling sequences for ' + ids.length + ' contacts...');
    const data = await callEngine({ action:'schedule_followups', contact_ids:ids, tone:fuTone, pain:fuPain });
    setLog('✅ Created ' + data.sequences_created + ' sequences (4 touchpoints each)');
    await loadStats();
    setLoading(false);
  };

  const Tag = ({ label, active, onClick, color='#4f8ef7' }: { label:string, active:boolean, onClick:()=>void, color?:string }) => (
    <span onClick={onClick} style={{
      display:'inline-block', padding:'4px 10px', margin:'3px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600,
      background: active ? color : 'transparent', color: active ? '#fff' : '#7a8ba6',
      border: '1px solid ' + (active ? color : '#2a3348')
    }}>{label}</span>
  );

  const mBtn = (m: typeof mode, label: string) => (
    <button onClick={() => setMode(m)} style={{
      padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
      background: mode===m ? '#4f8ef7' : '#2a3348', color: mode===m ? '#fff' : '#7a8ba6'
    }}>{label}</button>
  );

  const inp = (val:string, set:(v:string)=>void, ph:string, type='text') => (
    <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
      style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348',
        borderRadius:7, color:'#e8ecf4', fontSize:13, boxSizing:'border-box' as const, marginBottom:10 }} />
  );

  const textareaStyle = {
    width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348',
    borderRadius:7, color:'#e8ecf4', fontSize:13, boxSizing:'border-box' as const
  };

  return (
    <div>
      <StatBar items={[
        { label:'Found (Apollo)', value:stats.found, sub:'this search' },
        { label:'In Pipeline', value:stats.imported, sub:'total contacts' },
        { label:'Emails Sent', value:stats.emailed, sub:'logged' },
        { label:'Sequences', value:stats.sequenced, sub:'active' },
      ]} />

      <div style={{ display:'flex', gap:8, margin:'16px 0', flexWrap:'wrap' }}>
        {mBtn('search','🔍 Find Contacts')}
        {mBtn('individual','👤 Individual Outreach')}
        {mBtn('mass','📧 Mass Email')}
        {mBtn('followup','🔁 Schedule Follow-ups')}
      </div>

      {log && (
        <div style={{ padding:'10px 14px', background:'#0d1a0d', border:'1px solid #38c9a055', borderRadius:7, fontSize:13, color:'#38c9a0', marginBottom:12 }}>{log}</div>
      )}

      {mode === 'search' && (
        <>
          <Card title='🔍 Apollo.io Contact Search'>
            <Label>Job titles (click to toggle)</Label>
            <div style={{ marginBottom:10 }}>
              {CBAM_TITLES.map(t => <Tag key={t} label={t} active={titles.includes(t)} onClick={() => setTitles(ts => ts.includes(t)?ts.filter(x=>x!==t):[...ts,t])} />)}
            </div>
            <Label>Countries (click to toggle)</Label>
            <div style={{ marginBottom:16 }}>
              {COUNTRIES.map(c => <Tag key={c} label={c} active={countries.includes(c)} color='#38c9a0' onClick={() => setCountries(cs => cs.includes(c)?cs.filter(x=>x!==c):[...cs,c])} />)}
            </div>
            <BtnRow>
              <Btn onClick={doSearch} disabled={loading}>{loading ? 'Searching...' : '🔍 Search Apollo'}</Btn>
              {results.length > 0 && (
                <Btn onClick={() => { setPage(p=>p+1); doSearch(); }} color='#2a3348' textColor='#e8ecf4'>Next Page</Btn>
              )}
            </BtnRow>
          </Card>

          <Card title='🤖 Apify — Scrape LinkedIn Companies'>
            <div style={{ fontSize:12, color:'#7a8ba6', marginBottom:8 }}>Paste one LinkedIn company URL per line.</div>
            <textarea
              value={apifyUrls}
              onChange={e => setApifyUrls(e.target.value)}
              placeholder="https://linkedin.com/company/coolset"
              rows={4}
              style={textareaStyle}
            />
            <BtnRow>
              <Btn onClick={doApify} disabled={loading} color='#9b59b6'>{loading ? 'Scraping...' : '🤖 Scrape via Apify'}</Btn>
            </BtnRow>
          </Card>

          {results.length > 0 && (
            <Card title={'Results — ' + results.length + ' contacts'}>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <Btn onClick={() => setSelected(new Set(results.map((_,i)=>String(i))))} color='#2a3348' textColor='#e8ecf4'>Select All</Btn>
                <Btn onClick={() => setSelected(new Set())} color='#2a3348' textColor='#e8ecf4'>Clear</Btn>
                <Btn onClick={importSelected} disabled={loading}>📥 Import Selected ({selected.size})</Btn>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr>{['','Name','Role','Company','Country','Email',''].map(h => (
                      <th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'#7a8ba6', borderBottom:'1px solid #2a3348' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {results.map((c,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #1a2035' }}>
                        <td style={{ padding:'6px 8px' }}>
                          <input type='checkbox' checked={selected.has(String(i))} onChange={() => setSelected(s => { const n=new Set(s); n.has(String(i))?n.delete(String(i)):n.add(String(i)); return n; })} />
                        </td>
                        <td style={{ padding:'6px 8px', color:'#e8ecf4' }}>{c.first_name} {c.last_name}</td>
                        <td style={{ padding:'6px 8px', color:'#7a8ba6' }}>{c.role}</td>
                        <td style={{ padding:'6px 8px', color:'#e8ecf4' }}>{c.company}</td>
                        <td style={{ padding:'6px 8px', color:'#7a8ba6' }}>{c.country}</td>
                        <td style={{ padding:'6px 8px' }}>
                          {c.email
                            ? <span style={{ color:'#38c9a0' }}>{c.email}{c.email_confidence ? ' (' + c.email_confidence + '%)' : ''}</span>
                            : <button onClick={() => verifyEmail(i)} style={{ background:'none', border:'1px solid #2a3348', color:'#f7a94f', borderRadius:4, padding:'2px 7px', fontSize:11, cursor:'pointer' }}>Find email</button>
                          }
                        </td>
                        <td style={{ padding:'6px 8px' }}>
                          {c.linkedin_url && <a href={c.linkedin_url} target='_blank' rel='noreferrer' style={{ color:'#4f8ef7', fontSize:11 }}>LinkedIn</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {mode === 'individual' && (
        <Card title='👤 Individual Outreach'>
          <Grid2>
            <div>
              <Label>First name</Label>{inp(indiv.first_name, v=>setIndiv(c=>({...c,first_name:v})), 'Marie')}
              <Label>Last name</Label>{inp(indiv.last_name, v=>setIndiv(c=>({...c,last_name:v})), 'Dupont')}
              <Label>Company</Label>{inp(indiv.company, v=>setIndiv(c=>({...c,company:v})), 'Coolset')}
              <Label>Role</Label>{inp(indiv.role, v=>setIndiv(c=>({...c,role:v})), 'Head of Sustainability')}
            </div>
            <div>
              <Label>Email</Label>{inp(indiv.email, v=>setIndiv(c=>({...c,email:v})), 'marie@coolset.com', 'email')}
              <Label>LinkedIn URL</Label>{inp(indiv.linkedin_url, v=>setIndiv(c=>({...c,linkedin_url:v})), 'https://linkedin.com/in/marie')}
              <Label>Channel</Label>
              <select value={indivChannel} onChange={e=>setIndivChannel(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, marginBottom:10 }}>
                <option value='linkedin'>LinkedIn DM</option>
                <option value='email'>Email</option>
                <option value='call'>Phone Call</option>
              </select>
              <Label>Message</Label>
              <textarea value={indivMsg} onChange={e=>setIndivMsg(e.target.value)} placeholder='Your personalised message...'
                rows={5} style={textareaStyle} />
            </div>
          </Grid2>
          <BtnRow>
            {indivChannel==='linkedin' && indiv.linkedin_url && (
              <Btn onClick={()=>window.open(indiv.linkedin_url,'_blank')} color='#0077b5'>Open LinkedIn</Btn>
            )}
            {indivChannel==='email' && indiv.email && (
              <Btn onClick={()=>window.open('mailto:'+indiv.email+'?subject=Quick question — SupplyMind AI&body='+encodeURIComponent(indivMsg),'_blank')} color='#4f8ef7'>Open in Gmail</Btn>
            )}
            <Btn onClick={async()=>{
              setLoading(true);
              await callEngine({ action:'import_contacts', contacts:[{...indiv, source:'manual'}] });
              const { data:{user} } = await supabase.auth.getUser();
              if (user) await supabase.from('activities').insert({ user_id:user.id, type:indivChannel==='email'?'Email':'LinkedIn', company:indiv.company, note:'Reached out to '+indiv.first_name });
              setLog('✅ Contact saved + activity logged');
              await loadStats();
              setLoading(false);
            }} color='#2a3348' textColor='#e8ecf4' disabled={loading}>Save + Log</Btn>
          </BtnRow>
        </Card>
      )}

      {mode === 'mass' && (
        <Card title='📧 Mass Email Campaign'>
          <div style={{ background:'#1a2d1a', border:'1px solid #38c9a055', borderRadius:7, padding:'10px 14px', fontSize:12, color:'#38c9a0', marginBottom:16 }}>
            Sends to all pipeline contacts with an email. Logs every send. Opens Gmail with all recipients.
          </div>
          <Label>Subject line</Label>
          <input value={massSubject} onChange={e=>setMassSubject(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, boxSizing:'border-box' as const, marginBottom:10 }} />
          <Label>Body — use {'{{first_name}}'}, {'{{company}}'}, {'{{role}}'} for personalisation</Label>
          <textarea value={massBody} onChange={e=>setMassBody(e.target.value)} rows={10} style={textareaStyle} />
          <BtnRow>
            <Btn onClick={sendMass} disabled={loading}>{loading ? 'Sending...' : '📧 Send Mass Email'}</Btn>
          </BtnRow>
        </Card>
      )}

      {mode === 'followup' && (
        <Card title='🔁 Schedule 4-Touch Follow-up Sequences'>
          <div style={{ background:'#1a1a2d', border:'1px solid #4f8ef755', borderRadius:7, padding:'10px 14px', fontSize:12, color:'#4f8ef7', marginBottom:16 }}>
            Schedules a 4-touch sequence for all new contacts: Day 0 LinkedIn → Day 3 DM → Day 7 Email → Day 14 Breakup.
          </div>
          <Grid2>
            <div>
              <Label>Tone</Label>
              <select value={fuTone} onChange={e=>setFuTone(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, marginBottom:10 }}>
                <option value='founder'>Founder-to-founder</option>
                <option value='consultative'>Consultative</option>
                <option value='bold'>Bold / challenger</option>
              </select>
            </div>
            <div>
              <Label>Pain point context</Label>
              {inp(fuPain, setFuPain, 'Manual CBAM tracking, 200+ suppliers...')}
            </div>
          </Grid2>
          <BtnRow>
            <Btn onClick={scheduleFollowups} disabled={loading}>{loading ? 'Scheduling...' : '🔁 Schedule for All New Contacts'}</Btn>
          </BtnRow>
        </Card>
      )}
    </div>
  );
}
