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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060b11",color:"#7a8ba6",fontSize:14}}>
      Loading SupplyMind AI...
    </div>
  );
  if (!session) return <Auth />;

  return (
    <div style={{minHeight:"100vh",background:"#060b11"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",borderBottom:"1px solid #2a3348",background:"#0d1117"}}>
        <span style={{color:"#4f8ef7",fontWeight:800,fontSize:18}}>⚡ SupplyMind AI</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#7a8ba6",fontSize:12}}>{session.user.email}</span>
          <button onClick={()=>supabase.auth.signOut()} style={{background:"none",border:"1px solid #2a3348",borderRadius:6,padding:"5px 12px",color:"#7a8ba6",cursor:"pointer",fontSize:12}}>Sign out</button>
        </div>
      </div>
      <div style={{display:"flex",gap:0,padding:"0 24px",borderBottom:"1px solid #2a3348",background:"#0d1117",overflowX:"auto"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"12px 16px",background:"none",border:"none",cursor:"pointer",
            fontSize:13,fontWeight:600,
            color: tab===t.id ? "#4f8ef7" : "#7a8ba6",
            borderBottom: tab===t.id ? "2px solid #4f8ef7" : "2px solid transparent",
            whiteSpace:"nowrap"
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
        {tab==="outreach"  && <Outreach />}
        {tab==="generate"  && <Generate  session={session} />}
        {tab==="sequence"  && <Sequence  session={session} />}
        {tab==="contacts"  && <Contacts  session={session} />}
        {tab==="tracker"   && <Tracker   session={session} />}
        {tab==="guide"     && <Guide />}
        {tab==="settings"  && <Settings  session={session} />}
      </div>
    </div>
  );
}