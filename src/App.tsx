import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import Generate from "./tabs/Generate";
import Contacts from "./tabs/Contacts";
import Sequence from "./tabs/Sequence";
import Tracker from "./tabs/Tracker";
import Settings from "./tabs/Settings";
import Guide from "./tabs/Guide";
import Outreach from "./tabs/Outreach";
import { injectFormStyles } from "./components/Card";

const TABS = [
  { id:"outreach", label:"🚀 Outreach" },
  { id:"generate", label:"✍️ Generate" },
  { id:"sequence", label:"🔁 Sequence" },
  { id:"contacts", label:"👥 Contacts" },
  { id:"tracker",  label:"📊 Tracker" },
  { id:"guide",    label:"📖 Guide" },
  { id:"settings", label:"⚙️ Settings" },
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState("outreach");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectFormStyles();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060b11",color:"#4f8ef7",fontSize:16,fontWeight:600}}>
      Loading SupplyMind AI...
    </div>
  );

  if (!session) return <Auth />;

  return (
    <div style={{ minHeight:"100vh", background:"#060b11", fontFamily:"Inter,system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#0d1117", borderBottom:"1px solid #2a3348", padding:"0 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 }}>
          <span style={{ fontWeight:800, fontSize:17, color:"#4f8ef7", letterSpacing:"-0.3px" }}>
            ⚡ SupplyMind AI
          </span>
          <span style={{ fontSize:12, color:"#7a8ba6" }}>{session.user.email}</span>
          <button onClick={()=>supabase.auth.signOut()} style={{
            background:"none", border:"1px solid #2a3348", borderRadius:6,
            padding:"5px 12px", color:"#7a8ba6", cursor:"pointer", fontSize:12
          }}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#0d1117", borderBottom:"1px solid #2a3348", padding:"0 24px", overflowX:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"12px 16px", background:"none", border:"none", cursor:"pointer",
              fontSize:13, fontWeight:600,
              color: tab===t.id ? "#4f8ef7" : "#7a8ba6",
              borderBottom: tab===t.id ? "2px solid #4f8ef7" : "2px solid transparent",
              whiteSpace:"nowrap"
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 24px" }}>
        {tab==="outreach"  && <Outreach />}
        {tab==="generate"  && <Generate />}
        {tab==="sequence"  && <Sequence />}
        {tab==="contacts"  && <Contacts />}
        {tab==="tracker"   && <Tracker />}
        {tab==="guide"     && <Guide />}
        {tab==="settings"  && <Settings />}
      </div>
    </div>
  );
}
