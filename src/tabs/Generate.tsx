import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Card, Label, Btn, BtnRow, Grid2, StatBar } from '../components/Card';

const SUPABASE_URL: string = (import.meta as any).env.VITE_SUPABASE_URL;

interface Props { session: Session; }

export default function Generate({ session }: Props) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [country, setCountry] = useState('');
  const [hook, setHook] = useState('');
  const [channel, setChannel] = useState('email');
  const [goal, setGoal] = useState('demo');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ contacts:0, touchpoints:0, replies:0, demos:0 });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const uid = session.user.id;
    const [{ count:c }, { count:t }, { count:r }, { count:d }] = await Promise.all([
      supabase.from('contacts').select('*',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('status','sent'),
      supabase.from('activities').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('type','Reply'),
      supabase.from('activities').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('type','Demo'),
    ]);
    setStats({ contacts:c||0, touchpoints:t||0, replies:r||0, demos:d||0 });
  };

  const generate = async () => {
    setLoading(true);
    setOutput('');
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(SUPABASE_URL + '/functions/v1/generate-message', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + s?.access_token },
        body: JSON.stringify({ channel, name:name||'there', company:company||'your company', role, hook, goal }),
      });
      const data = await res.json();
      setOutput(data.message || data.error || 'No response received');
    } catch(e) {
      setOutput('❌ Error — check your internet connection and try again');
    }
    setLoading(false);
  };

  const logSent = async (ch: string) => {
    if (!output) return;
    await supabase.from('messages').insert({ user_id:session.user.id, channel:ch, body:output, touch_number:1, status:'sent', sent_at:new Date().toISOString(), goal });
    await supabase.from('activities').insert({ user_id:session.user.id, type:ch==='email'?'Email':'LinkedIn', company, note:'Sent to '+name+' at '+company });
    loadStats();
    alert('✅ Logged successfully!');
  };

  const inp = (val:string, set:(v:string)=>void, ph:string) => (
    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
      style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, boxSizing:'border-box' as const, marginBottom:10 }} />
  );

  const sel = (val:string, set:(v:string)=>void, opts:{v:string,l:string}[]) => (
    <select value={val} onChange={e=>set(e.target.value)}
      style={{ width:'100%', padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, marginBottom:10 }}>
      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  return (
    <div>
      <StatBar items={[
        { label:'Contacts', value:stats.contacts, sub:'in pipeline' },
        { label:'Touchpoints', value:stats.touchpoints, sub:'sent' },
        { label:'Replies', value:stats.replies, sub:'received' },
        { label:'Demos', value:stats.demos, sub:'booked 📅' },
      ]} />

      <Card title='🤖 AI Message Generator'>
        <Grid2>
          <div>
            <Label>First name</Label>{inp(name, setName, 'Marie')}
            <Label>Company</Label>{inp(company, setCompany, 'Coolset')}
            <Label>Role</Label>{inp(role, setRole, 'Head of Sustainability')}
            <Label>Country</Label>{inp(country, setCountry, 'Netherlands')}
          </div>
          <div>
            <Label>Channel</Label>
            {sel(channel, setChannel, [
              {v:'email', l:'Cold email'},
              {v:'linkedin', l:'LinkedIn connection note'},
              {v:'followup', l:'Follow-up (no reply)'},
              {v:'value', l:'Value-add message'},
            ])}
            <Label>Recent activity / hook (optional)</Label>
            <textarea value={hook} onChange={e=>setHook(e.target.value)}
              placeholder='e.g. They posted about CBAM readiness last week...'
              style={{ width:'100%', minHeight:80, padding:'9px 12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#e8ecf4', fontSize:13, boxSizing:'border-box' as const, marginBottom:10 }} />
            <Label>Goal</Label>
            {sel(goal, setGoal, [
              {v:'demo', l:'Book a 20-min demo'},
              {v:'reply', l:'Get a reply'},
              {v:'intro', l:'Warm intro / awareness'},
              {v:'feedback', l:'Ask for product feedback'},
            ])}
          </div>
        </Grid2>
        <BtnRow>
          <Btn onClick={generate} disabled={loading}>{loading ? 'Generating...' : '🤖 Generate Message'}</Btn>
        </BtnRow>
      </Card>

      {output && (
        <Card title='Generated Message'>
          <textarea readOnly value={output}
            style={{ width:'100%', minHeight:140, padding:'12px', background:'#0a0f18', border:'1px solid #2a3348', borderRadius:7, color:'#38c9a0', fontSize:13, boxSizing:'border-box' as const, resize:'vertical' }} />
          <BtnRow>
            <Btn onClick={()=>navigator.clipboard.writeText(output)} color='#2a3348' textColor='#e8ecf4'>📋 Copy</Btn>
            <Btn onClick={()=>logSent('linkedin')} color='#38c9a0' textColor='#0d1810'>✅ Log LinkedIn Sent</Btn>
            <Btn onClick={()=>logSent('email')} color='#38c9a0' textColor='#0d1810'>✅ Log Email Sent</Btn>
            <Btn onClick={generate} color='#2a3348' textColor='#e8ecf4'>🔄 Regenerate</Btn>
          </BtnRow>
        </Card>
      )}
    </div>
  );
}
