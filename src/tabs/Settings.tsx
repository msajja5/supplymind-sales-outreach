import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, Label, Btn } from '../components/Card'

const TOOLS = [
  { k:'apollo_api_key', label:'Apollo.io API Key', hint:'Settings → API', url:'https://apollo.io/settings' },
  { k:'hunter_api_key', label:'Hunter.io API Key', hint:'50 free searches/month', url:'https://hunter.io/api-keys' },
  { k:'apify_api_key', label:'Apify API Key', hint:'$5 free credit', url:'https://console.apify.com/account/integrations' },
  { k:'mailmeteor_sheet_url', label:'Mailmeteor Google Sheet URL', hint:'Paste your Google Sheet URL', url:'https://mailmeteor.com' },
  { k:'gmail_address', label:'Gmail Address (for sending)', hint:'your@gmail.com', url:'' },
]

type Config = Record<string,string>

export default function Settings() {
  const [cfg, setCfg] = useState<Config>({ apollo_api_key:'', hunter_api_key:'', apify_api_key:'', mailmeteor_sheet_url:'', gmail_address:'' })
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('tool_configs').select('*').eq('user_id',user.id).maybeSingle()
    if (data) setCfg({ apollo_api_key:data.apollo_api_key||'', hunter_api_key:data.hunter_api_key||'',
      apify_api_key:data.apify_api_key||'', mailmeteor_sheet_url:data.mailmeteor_sheet_url||'', gmail_address:data.gmail_address||'' })
  }

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('tool_configs').upsert({ user_id:user.id, ...cfg, updated_at:new Date().toISOString() })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <Card title="⚙️ Tool Configuration">
        <p style={{fontSize:12,color:'#7a8ba6',marginBottom:4}}>
          All keys stored in your private Supabase database (Row Level Security — only you can see them).
        </p>
        {TOOLS.map(t => (
          <div key={t.k}>
            <Label>{t.label}{t.url && <a href={t.url} target="_blank" rel="noreferrer" style={{marginLeft:8,fontSize:11}}> Get key →</a>}</Label>
            <input type={t.k.includes('key')?'password':'text'} placeholder={t.hint}
              value={cfg[t.k]||''} onChange={e => setCfg(p=>({...p,[t.k]:e.target.value}))} />
          </div>
        ))}
        <div style={{marginTop:18}}>
          <Btn onClick={save}>{saved ? '✅ Saved!' : '💾 Save Configuration'}</Btn>
        </div>
      </Card>
    </div>
  )
}
