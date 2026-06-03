import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import Generate from '../tabs/Generate'
import Sequence from '../tabs/Sequence'
import Contacts from '../tabs/Contacts'
import Tracker from '../tabs/Tracker'
import Guide from '../tabs/Guide'
import Settings from '../tabs/Settings'

const TABS = [
  {id:'generate',label:'✍️ Generate'},
  {id:'sequence',label:'🔁 Sequence'},
  {id:'contacts',label:'👥 Contacts'},
  {id:'tracker',label:'📊 Tracker'},
  {id:'guide',label:'📋 Guide'},
  {id:'settings',label:'⚙️ Settings'},
]

export default function Dashboard({ session }: { session: Session }) {
  const [tab, setTab] = useState('generate')

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#0d0f14'}}>
      {/* Header */}
      <header style={{background:'#161b25',borderBottom:'1px solid #2a3348',padding:'12px 28px',display:'flex',alignItems:'center',gap:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#4f8ef7,#38c9a0)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🧠</div>
          <span style={{fontWeight:700,fontSize:16}}>SupplyMind <span style={{color:'#38c9a0'}}>AI</span></span>
        </div>
        <span style={{marginLeft:'auto',fontSize:12,color:'#7a8ba6',display:'none'}}>
          {session.user.email}
        </span>
        <span style={{fontSize:12,color:'#7a8ba6'}}>Sales Outreach · ESG/CBAM</span>
        <button onClick={signOut} style={{background:'none',border:'1px solid #2a3348',color:'#7a8ba6',borderRadius:6,padding:'5px 12px',fontSize:12,cursor:'pointer'}}>
          Sign out
        </button>
      </header>

      {/* Nav */}
      <nav style={{background:'#161b25',borderBottom:'1px solid #2a3348',padding:'0 28px',display:'flex',gap:0,flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?'#4f8ef7':'transparent'}`,
              color:tab===t.id?'#4f8ef7':'#7a8ba6',fontSize:13,fontWeight:500,padding:'11px 16px',cursor:'pointer'}}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{padding:'24px 28px',maxWidth:1100,margin:'0 auto',width:'100%'}}>
        {tab === 'generate' && <Generate session={session} />}
        {tab === 'sequence' && <Sequence session={session} />}
        {tab === 'contacts' && <Contacts />}
        {tab === 'tracker' && <Tracker />}
        {tab === 'guide' && <Guide />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}
