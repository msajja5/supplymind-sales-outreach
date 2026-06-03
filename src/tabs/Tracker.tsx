import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Activity } from '../lib/types'
import { Card, Label, Btn, BtnRow, Grid2, Empty } from '../components/Card'

const ICON: Record<string,string> = { LinkedIn:'💼', Email:'📧', Call:'📞', Reply:'🎉', Demo:'🚀', Note:'📝' }
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Tracker() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [f, setF] = useState({ type:'LinkedIn', name:'', company:'', note:'' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('activities').select('*')
      .eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
    setActivities(data || [])
  }

  const log = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activities').insert({
      user_id:user.id, type:f.type, company:f.company,
      note: [f.name, f.note].filter(Boolean).join(' — ')
    })
    setF({ type:'LinkedIn', name:'', company:'', note:'' })
    await load(); setLoading(false)
  }

  const today = new Date()
  const weekStart = new Date(today); weekStart.setDate(today.getDate()-today.getDay())
  const weekDays = Array.from({length:7},(_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d })
  const countDay = (d: Date) => activities.filter(a => new Date(a.created_at).toDateString()===d.toDateString()).length

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setF(p => ({...p,[k]:e.target.value}))

  return (
    <div>
      <Card title="📊 Log Activity">
        <Grid2>
          <div>
            <Label>Activity type</Label>
            <select value={f.type} onChange={set('type')}>
              {Object.entries(ICON).map(([k,v]) => <option key={k} value={k}>{v} {k}</option>)}
            </select>
            <Label>Contact name</Label>
            <input placeholder="Marie" value={f.name} onChange={set('name')} />
          </div>
          <div>
            <Label>Company</Label>
            <input placeholder="Coolset" value={f.company} onChange={set('company')} />
            <Label>Note</Label>
            <textarea style={{minHeight:72}} placeholder="What happened? Any next step?" value={f.note} onChange={set('note')} />
          </div>
        </Grid2>
        <BtnRow>
          <Btn onClick={log} disabled={loading}>{loading?'Logging...':'✅ Log Activity'}</Btn>
        </BtnRow>
      </Card>

      <Card title="📅 This Week">
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {weekDays.map((d,i) => (
            <div key={i} style={{background:'#161b25',border:`1px solid ${d.toDateString()===today.toDateString()?'#4f8ef7':'#2a3348'}`,borderRadius:7,padding:'10px 6px',textAlign:'center'}}>
              <div style={{fontSize:11,color:'#7a8ba6',marginBottom:6}}>{DAYS[d.getDay()]}</div>
              <div style={{fontSize:20,fontWeight:700,color:'#4f8ef7'}}>{countDay(d)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="📜 Activity Log">
        {activities.length===0 ? <Empty msg="No activity logged yet." /> :
          activities.slice(0,50).map(a => (
            <div key={a.id} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid #2a3348',alignItems:'flex-start'}}>
              <div style={{width:32,height:32,borderRadius:7,background:'#1a2d4a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                {ICON[a.type]||'📌'}
              </div>
              <div>
                <div style={{fontSize:13}}><strong>{a.type}</strong>{a.company ? ` · ${a.company}` : ''}</div>
                {a.note && <div style={{color:'#7a8ba6',fontSize:12,marginTop:2}}>{a.note}</div>}
                <div style={{color:'#7a8ba6',fontSize:11,marginTop:2}}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  )
}
