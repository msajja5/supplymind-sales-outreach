import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Card, Label, Btn, BtnRow, Grid2, OutputBox, StatBar } from '../components/Card'

const SUPABASE_URL: string = (import.meta as any).env.VITE_SUPABASE_URL

interface Props { session: Session }

export default function Generate({ session }: Props) {
  const [f, setF] = useState({ name:'', company:'', role:'', country:'', hook:'', channel:'linkedin', goal:'demo' })
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ contacts:0, touchpoints:0, replies:0, demos:0 })

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    const uid = session.user.id
    const [{ count: c }, { count: t }, { count: r }, { count: d }] = await Promise.all([
      supabase.from('contacts').select('*',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('status','sent'),
      supabase.from('activities').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('type','Reply'),
      supabase.from('activities').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('type','Demo'),
    ])
    setStats({ contacts:c||0, touchpoints:t||0, replies:r||0, demos:d||0 })
  }

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-message`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
        body: JSON.stringify({ type:'single', channel:f.channel, name:f.name||'there',
          company:f.company||'your company', role:f.role, hook:f.hook, goal:f.goal })
      })
      const data = await res.json()
      setOutput(data.message || data.error || '')
    } catch(e) { setOutput('Error generating — check connection') }
    setLoading(false)
  }

  const logSent = async (channel: string) => {
    if (!output) return
    await supabase.from('messages').insert({ user_id:session.user.id, channel,
      body:output, touch_number:1, status:'sent', sent_at:new Date().toISOString(), goal:f.goal })
    await supabase.from('activities').insert({ user_id:session.user.id,
      type:channel==='email'?'Email':'LinkedIn', company:f.company,
      note:`Sent to ${f.name} at ${f.company}` })
    loadStats()
    alert('✅ Logged!')
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setF(prev => ({...prev, [k]: e.target.value}))

  return (
    <div>
      <StatBar items={[
        {label:'Contacts',value:stats.contacts,sub:'in pipeline'},
        {label:'Touchpoints',value:stats.touchpoints,sub:'sent'},
        {label:'Replies',value:stats.replies,sub:'received'},
        {label:'Demos',value:stats.demos,sub:'booked 🚀'},
      ]} />

      <Card title="✍️ AI Message Generator">
        <Grid2>
          <div>
            <Label>First name</Label><input placeholder="Marie" value={f.name} onChange={set('name')} />
            <Label>Company</Label><input placeholder="Coolset" value={f.company} onChange={set('company')} />
            <Label>Role</Label><input placeholder="Head of Sustainability" value={f.role} onChange={set('role')} />
            <Label>Country</Label><input placeholder="Netherlands" value={f.country} onChange={set('country')} />
          </div>
          <div>
            <Label>Channel</Label>
            <select value={f.channel} onChange={set('channel')}>
              <option value="linkedin">LinkedIn connection note</option>
              <option value="email">Cold email</option>
              <option value="followup">Follow-up (no reply)</option>
              <option value="value">Value-add message</option>
            </select>
            <Label>Recent activity / hook (optional)</Label>
            <textarea style={{minHeight:80}} placeholder="e.g. They posted about CBAM readiness last week..." value={f.hook} onChange={set('hook')} />
            <Label>Goal</Label>
            <select value={f.goal} onChange={set('goal')}>
              <option value="demo">Book a 20-min demo</option>
              <option value="reply">Get a reply</option>
              <option value="intro">Warm intro / awareness</option>
              <option value="feedback">Ask for product feedback</option>
            </select>
          </div>
        </Grid2>
        <BtnRow>
          <Btn onClick={generate} disabled={loading}>{loading ? 'Generating...' : '🤖 Generate Message'}</Btn>
        </BtnRow>
      </Card>

      {output && (
        <Card title="Generated Message">
          <OutputBox text={output} />
          <BtnRow>
            <Btn onClick={() => navigator.clipboard.writeText(output)} color="#2a3348" textColor="#e8ecf4">📋 Copy</Btn>
            <Btn onClick={() => logSent('linkedin')} color="#38c9a0" textColor="#0d1810">✅ Log LinkedIn Sent</Btn>
            <Btn onClick={() => logSent('email')} color="#38c9a0" textColor="#0d1810">✅ Log Email Sent</Btn>
            <Btn onClick={generate} color="#2a3348" textColor="#e8ecf4">🔄 Regenerate</Btn>
          </BtnRow>
        </Card>
      )}
    </div>
  )
}
