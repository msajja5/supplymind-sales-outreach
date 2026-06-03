import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Card, Label, Btn, BtnRow, Grid2, OutputBox } from '../components/Card'

const SUPABASE_URL: string = (import.meta as any).env.VITE_SUPABASE_URL
const LABELS = ['Touch 1 — Day 0 · LinkedIn Connection Note','Touch 2 — Day 3 · LinkedIn DM','Touch 3 — Day 7 · Cold Email','Touch 4 — Day 14 · Breakup Email']

export default function Sequence({ session }: { session: Session }) {
  const [f, setF] = useState({ name:'', company:'', role:'', pain:'', tone:'founder' })
  const [seq, setSeq] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-message`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
        body: JSON.stringify({ type:'sequence', name:f.name||'there',
          company:f.company||'your company', role:f.role, pain:f.pain, tone:f.tone })
      })
      setSeq(await res.json())
    } catch(e) { alert('Error generating') }
    setLoading(false)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setF(p => ({...p,[k]:e.target.value}))

  return (
    <div>
      <Card title="🔁 Full 4-Touch Sequence Generator">
        <Grid2>
          <div>
            <Label>First name</Label><input placeholder="Thomas" value={f.name} onChange={set('name')} />
            <Label>Company</Label><input placeholder="Plan A" value={f.company} onChange={set('company')} />
            <Label>Role</Label><input placeholder="CEO" value={f.role} onChange={set('role')} />
          </div>
          <div>
            <Label>Pain point / context</Label>
            <textarea style={{minHeight:80}} placeholder="e.g. Manually tracking CBAM in Excel, 200+ suppliers..." value={f.pain} onChange={set('pain')} />
            <Label>Tone</Label>
            <select value={f.tone} onChange={set('tone')}>
              <option value="founder">Founder-to-founder</option>
              <option value="consultative">Consultative</option>
              <option value="bold">Bold / challenger</option>
            </select>
          </div>
        </Grid2>
        <BtnRow>
          <Btn onClick={generate} disabled={loading}>{loading?'Generating...':'🤖 Generate Full Sequence'}</Btn>
        </BtnRow>
      </Card>

      {(['t1','t2','t3','t4'] as const).map((k,i) => seq[k] && (
        <div key={k} style={{background:'#161b25',border:'1px solid #2a3348',borderRadius:8,padding:14,marginBottom:12}}>
          <div style={{fontSize:11,color:'#4f8ef7',fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>{LABELS[i]}</div>
          <OutputBox text={seq[k]} />
          <BtnRow>
            <Btn sm onClick={() => navigator.clipboard.writeText(seq[k])} color="#2a3348" textColor="#e8ecf4">📋 Copy</Btn>
          </BtnRow>
        </div>
      ))}
    </div>
  )
}
