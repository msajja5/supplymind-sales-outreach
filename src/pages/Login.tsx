import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [info, setInfo] = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setInfo('')
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false) }
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message) }
      else { setInfo('Check your email to confirm your account, then sign in.') }
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d0f14'}}>
      <div style={{background:'#1e2535',border:'1px solid #2a3348',borderRadius:12,padding:'36px 32px',width:360}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <div style={{width:40,height:40,background:'linear-gradient(135deg,#4f8ef7,#38c9a0)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🧠</div>
          <div>
            <div style={{fontWeight:700,fontSize:17}}>SupplyMind <span style={{color:'#38c9a0'}}>AI</span></div>
            <div style={{fontSize:12,color:'#7a8ba6'}}>Sales Outreach Cockpit</div>
          </div>
        </div>
        <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <div style={{color:'#f75f5f',fontSize:12}}>{error}</div>}
          {info && <div style={{color:'#38c9a0',fontSize:12}}>{info}</div>}
          <button type="submit" disabled={loading}
            style={{background:'#4f8ef7',color:'#fff',border:'none',borderRadius:7,padding:'10px',fontWeight:600,fontSize:13,cursor:'pointer',marginTop:4}}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <button onClick={() => { setMode(m => m==='login'?'signup':'login'); setError(''); setInfo('') }}
          style={{background:'none',border:'none',color:'#7a8ba6',fontSize:12,cursor:'pointer',marginTop:12,width:'100%'}}>
          {mode === 'login' ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  )
}
