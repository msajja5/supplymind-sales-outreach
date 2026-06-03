import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true); setMsg("");
    const { error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setMsg("❌ " + error.message);
    else if (mode === "signup") setMsg("✅ Check your email to confirm signup.");
    setLoading(false);
  };

  const inp: React.CSSProperties = {
    width:"100%", padding:"10px 12px", background:"#161b25",
    border:"1px solid #2a3348", borderRadius:6, color:"#e8ecf4",
    fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10, display:"block"
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#060b11" }}>
      <div style={{ width:360, background:"#0d1117", border:"1px solid #2a3348", borderRadius:12, padding:32 }}>
        <h2 style={{ color:"#4f8ef7", margin:"0 0 4px", fontSize:22, fontWeight:800 }}>⚡ SupplyMind AI</h2>
        <p style={{ color:"#7a8ba6", fontSize:13, margin:"0 0 24px" }}>Sales Outreach Cockpit</p>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={inp} />
        {msg && <div style={{ fontSize:13, color: msg.startsWith("❌")?"#f75f5f":"#38c9a0", marginBottom:12 }}>{msg}</div>}
        <button onClick={handle} disabled={loading} style={{ width:"100%", padding:"11px", background:"#4f8ef7", color:"#fff", border:"none", borderRadius:7, fontWeight:700, fontSize:14, cursor:"pointer" }}>
          {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:"#7a8ba6" }}>
          {mode === "login" ? "No account? " : "Have an account? "}
          <button onClick={()=>setMode(m=>m==="login"?"signup":"login")} style={{ background:"none", border:"none", color:"#4f8ef7", cursor:"pointer", fontSize:12, fontWeight:600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
