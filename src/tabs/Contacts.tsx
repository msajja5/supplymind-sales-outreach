import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Contact } from '../lib/types'
import { Card, Label, Btn, BtnRow, Grid2, Empty } from '../components/Card'

const STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  new:{bg:'#1a2d4a',color:'#4f8ef7'}, contacted:{bg:'#1e2f1e',color:'#38c9a0'},
  replied:{bg:'#2d2a10',color:'#f7a94f'}, qualified:{bg:'#2a1e1e',color:'#f75f5f'},
  demo_booked:{bg:'#1a2d4a',color:'#4f8ef7'}, closed:{bg:'#1e2f1e',color:'#38c9a0'}, lost:{bg:'#2a1e1e',color:'#f75f5f'}
}

const BLANK = { first_name:'', last_name:'', company:'', role:'', email:'', linkedin_url:'', country:'', notes:'', source:'manual' }

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [f, setF] = useState(BLANK)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contacts').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
    setContacts(data || [])
  }

  const add = async () => {
    if (!f.first_name || !f.company) { alert('Name and company required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('contacts').insert({ ...f, user_id:user!.id, status:'new' })
    setF(BLANK); await load(); setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('contacts').update({ status }).eq('id', id)
    setContacts(cs => cs.map(c => c.id===id ? {...c, status:status as any} : c))
  }

  const del = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  const exportCSV = () => {
    const rows = [['Name','Company','Role','Email','LinkedIn','Country','Status','Notes','Added']]
    contacts.forEach(c => rows.push([
      `${c.first_name} ${c.last_name||''}`.trim(), c.company, c.role||'',
      c.email||'', c.linkedin_url||'', c.country||'', c.status, c.notes||'', c.created_at.slice(0,10)
    ]))
    const csv = rows.map(r => r.map(x => `"${x.replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `supplymind_contacts_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setF(p => ({...p,[k]:e.target.value}))

  return (
    <div>
      <Card title="👥 Add Contact">
        <Grid2>
          <div>
            <Label>First name *</Label><input placeholder="Marie" value={f.first_name} onChange={set('first_name')} />
            <Label>Last name</Label><input placeholder="Dupont" value={f.last_name} onChange={set('last_name')} />
            <Label>Company *</Label><input placeholder="Coolset" value={f.company} onChange={set('company')} />
            <Label>Role</Label><input placeholder="Head of Sustainability" value={f.role} onChange={set('role')} />
            <Label>Country</Label><input placeholder="Netherlands" value={f.country} onChange={set('country')} />
          </div>
          <div>
            <Label>Email</Label><input type="email" placeholder="marie@coolset.com" value={f.email} onChange={set('email')} />
            <Label>LinkedIn URL</Label><input placeholder="linkedin.com/in/marie" value={f.linkedin_url} onChange={set('linkedin_url')} />
            <Label>Source</Label>
            <select value={f.source} onChange={set('source')}>
              {['manual','apollo','hunter','apify','linkedin'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Label>Notes / pain point</Label>
            <textarea style={{minHeight:72}} placeholder="Uses Excel for CBAM, 200+ suppliers..." value={f.notes} onChange={set('notes')} />
          </div>
        </Grid2>
        <BtnRow>
          <Btn onClick={add} disabled={loading}>{loading?'Adding...':'+ Add Contact'}</Btn>
          <Btn onClick={exportCSV} color="#2a3348" textColor="#e8ecf4">⬇️ Export CSV</Btn>
        </BtnRow>
      </Card>

      <Card title={`Pipeline — ${contacts.length} contacts`}>
        {contacts.length === 0 ? <Empty msg="No contacts yet. Add your first target above." /> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>{['Name','Company','Role','Email','Status','Source',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#7a8ba6',fontWeight:500,borderBottom:'1px solid #2a3348',fontSize:12}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} style={{borderBottom:'1px solid #2a3348'}}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{c.first_name} {c.last_name||''}</td>
                    <td style={{padding:'10px 12px'}}>{c.company}</td>
                    <td style={{padding:'10px 12px',color:'#7a8ba6'}}>{c.role||'—'}</td>
                    <td style={{padding:'10px 12px'}}>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                        style={{width:'auto',background:STATUS_STYLE[c.status]?.bg||'#1a2d4a',
                          color:STATUS_STYLE[c.status]?.color||'#4f8ef7',border:'none',borderRadius:20,
                          padding:'3px 8px',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                        {['new','contacted','replied','qualified','demo_booked','closed','lost'].map(s =>
                          <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{padding:'10px 12px',color:'#7a8ba6',fontSize:12}}>{c.source||'manual'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <button onClick={() => del(c.id)} style={{background:'none',border:'none',color:'#f75f5f',cursor:'pointer',fontSize:14}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
