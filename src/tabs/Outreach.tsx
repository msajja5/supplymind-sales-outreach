"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, Label, Btn, BtnRow, Grid2, Empty, StatBar } from "../components/Card";

const SUPABASE_URL: string = (import.meta as any).env.VITE_SUPABASE_URL;
const ANON_KEY: string = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

type Mode = "search" | "individual" | "mass" | "followup";

const CBAM_TITLES = ["Head of Sustainability","CBAM Manager","ESG Director","Trade Compliance Manager","Sustainability Manager","VP ESG","Chief Sustainability Officer","Head of Trade Finance","Climate Director","Carbon Accounting Manager"];
const COUNTRIES = ["Netherlands","Belgium","Germany","France","Denmark","Sweden","Austria","Switzerland","Spain","Italy"];

export default function Outreach() {
  const [mode, setMode] = useState<Mode>("search");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [stats, setStats] = useState({ found: 0, imported: 0, emailed: 0, sequenced: 0 });

  // Search filters
  const [titles, setTitles] = useState<string[]>(["Head of Sustainability","CBAM Manager","ESG Director"]);
  const [countries, setCountries] = useState<string[]>(["Netherlands","Belgium","Germany"]);
  const [page, setPage] = useState(1);
  const [totalFound, setTotalFound] = useState(0);

  // Individual
  const [indivContact, setIndivContact] = useState({ first_name:"", last_name:"", company:"", email:"", linkedin_url:"", role:"", country:"" });
  const [indivMsg, setIndivMsg] = useState("");
  const [indivChannel, setIndivChannel] = useState("linkedin");

  // Mass email
  const [massSubject, setMassSubject] = useState("Quick question about CBAM readiness — SupplyMind AI");
  const [massBody, setMassBody] = useState(`Hi {{first_name}},

I noticed that managing CBAM compliance across dozens of suppliers is becoming a real operational challenge for companies like {{company}}.

We built SupplyMind AI specifically for this — it automates supplier data collection, carbon footprint calculations, and CBAM report generation.

Would a 20-minute call this week make sense?

Best,
Manjunath
SupplyMind AI`);

  // Follow-up
  const [fuTone, setFuTone] = useState("founder");
  const [fuPain, setFuPain] = useState("Manual CBAM tracking, 200+ suppliers");

  useEffect(() => { loadStats(); }, []);

  const callEngine = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/outreach-engine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ count: imp }, { count: em }, { count: sq }] = await Promise.all([
      supabase.from("contacts").select("*",{count:"exact",head:true}).eq("user_id",user.id),
      supabase.from("messages").select("*",{count:"exact",head:true}).eq("user_id",user.id).eq("status","sent"),
      supabase.from("sequences").select("*",{count:"exact",head:true}).eq("user_id",user.id),
    ]);
    setStats(s => ({ ...s, imported: imp||0, emailed: em||0, sequenced: sq||0 }));
  };

  const doSearch = async () => {
    setLoading(true); setLog("🔍 Searching Apollo.io...");
    const data = await callEngine({ action: "apollo_search", titles, countries, page });
    if (data.error) { setLog("❌ " + data.error); setLoading(false); return; }
    setResults(data.people || []);
    setTotalFound(data.total || 0);
    setStats(s => ({ ...s, found: data.people?.length || 0 }));
    setLog(`✅ Found ${data.people?.length || 0} contacts (${data.total || 0} total)`);
    setLoading(false);
  };

  const verifyEmail = async (idx: number) => {
    const c = results[idx];
    if (!c.email && !c.company) return;
    setLog(`🔍 Verifying email for ${c.first_name}...`);
    const domain = c.company?.toLowerCase().replace(/\s+/g,"")+".com";
    const data = await callEngine({ action: "hunter_verify", domain, first_name: c.first_name, last_name: c.last_name });
    if (data.email) {
      const updated = [...results];
      updated[idx] = { ...c, email: data.email, email_confidence: data.score };
      setResults(updated);
      setLog(`✅ Found email: ${data.email} (${data.score}% confidence)`);
    } else {
      setLog("⚠️ Email not found on Hunter.io");
    }
  };

  const importSelected = async () => {
    const toImport = results.filter((_,i) => selected.has(String(i)));
    if (!toImport.length) { setLog("⚠️ Select contacts first"); return; }
    setLoading(true); setLog(`📥 Importing ${toImport.length} contacts...`);
    const data = await callEngine({ action: "import_contacts", contacts: toImport });
    setLog(`✅ Imported ${data.imported} contacts to pipeline`);
    await loadStats(); setLoading(false);
  };

  const sendMass = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contacts } = await supabase.from("contacts").select("*").eq("user_id",user.id).neq("status","lost");
    const ids = (contacts||[]).filter((c:any)=>c.email).map((c:any)=>c.id);
    if (!ids.length) { setLog("⚠️ No contacts with email addresses found. Import contacts first."); return; }
    setLoading(true); setLog(`📧 Sending to ${ids.length} contacts...`);
    const data = await callEngine({ action: "send_mass_email", contact_ids: ids, subject: massSubject, body_template: massBody });
    setLog(`✅ Sent to ${data.sent} contacts. Check Tracker tab for logs.`);

    // Open mailto for the first batch (Gmail fallback)
    const firstContact = data.contacts?.[0];
    if (firstContact) {
      const allEmails = data.contacts.map((c:any)=>c.email).join(",");
      const mailto = `mailto:${allEmails}?subject=${encodeURIComponent(massSubject)}&body=${encodeURIComponent(massBody.replace(/{{first_name}}/g,"").replace(/{{company}}/g,"").replace(/{{role}}/g,""))}`;
      window.open(mailto, "_blank");
    }
    await loadStats(); setLoading(false);
  };

  const scheduleFollowups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: contacts } = await supabase.from("contacts").select("id").eq("user_id",user.id).eq("status","new");
    const ids = (contacts||[]).map((c:any)=>c.id);
    if (!ids.length) { setLog("⚠️ No new contacts found. Add contacts first."); return; }
    setLoading(true); setLog(`🔁 Scheduling 4-touch sequences for ${ids.length} contacts...`);
    const data = await callEngine({ action: "schedule_followups", contact_ids: ids, tone: fuTone, pain: fuPain });
    setLog(`✅ Created ${data.sequences_created} sequences (4 touchpoints each)`);
    await loadStats(); setLoading(false);
  };

  const toggleSelect = (i: number) => {
    setSelected(s => { const n = new Set(s); n.has(String(i)) ? n.delete(String(i)) : n.add(String(i)); return n; });
  };
  const selectAll = () => setSelected(new Set(results.map((_,i)=>String(i))));
  const clearAll = () => setSelected(new Set());

  const toggleTitle = (t: string) => setTitles(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t]);
  const toggleCountry = (c: string) => setCountries(cs => cs.includes(c) ? cs.filter(x=>x!==c) : [...cs,c]);

  const tag = (label: string, active: boolean, onClick: ()=>void, color="#4f8ef7") => (
    <button key={label} onClick={onClick} style={{
      padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",fontWeight:500,
      background: active ? color+"22" : "#161b25",
      border: `1px solid ${active ? color : "#2a3348"}`,
      color: active ? color : "#7a8ba6"
    }}>{label}</button>
  );

  const S = {
    modeBtn: (m: Mode) => ({
      padding:"8px 16px", borderRadius:7, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
      background: mode===m ? "#4f8ef7" : "#2a3348", color: mode===m ? "#fff" : "#7a8ba6"
    } as React.CSSProperties)
  };

  return (
    <div>
      <StatBar items={[
        {label:"Found (Apollo)",value:stats.found,sub:"this search"},
        {label:"In Pipeline",value:stats.imported,sub:"total contacts"},
        {label:"Emails Sent",value:stats.emailed,sub:"logged"},
        {label:"Sequences",value:stats.sequenced,sub:"active"},
      ]} />

      {/* Mode switcher */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <button style={S.modeBtn("search")} onClick={()=>setMode("search")}>🔍 Find Contacts</button>
        <button style={S.modeBtn("individual")} onClick={()=>setMode("individual")}>👤 Individual Outreach</button>
        <button style={S.modeBtn("mass")} onClick={()=>setMode("mass")}>📧 Mass Email</button>
        <button style={S.modeBtn("followup")} onClick={()=>setMode("followup")}>🔁 Schedule Follow-ups</button>
      </div>

      {/* Log bar */}
      {log && (
        <div style={{background:"#161b25",border:"1px solid #2a3348",borderRadius:7,padding:"10px 14px",
          fontSize:13,marginBottom:16,color: log.startsWith("❌")?"#f75f5f":log.startsWith("⚠️")?"#f7a94f":"#38c9a0"}}>
          {log}
        </div>
      )}

      {/* ── SEARCH MODE ── */}
      {mode === "search" && (
        <>
          <Card title="🔍 Apollo.io Contact Search">
            <Label>Job titles (click to toggle)</Label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
              {CBAM_TITLES.map(t => tag(t, titles.includes(t), ()=>toggleTitle(t), "#4f8ef7"))}
            </div>
            <Label>Countries (click to toggle)</Label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
              {COUNTRIES.map(c => tag(c, countries.includes(c), ()=>toggleCountry(c), "#38c9a0"))}
            </div>
            <BtnRow>
              <Btn onClick={doSearch} disabled={loading}>{loading?"Searching...":"🔍 Search Apollo"}</Btn>
              {results.length>0 && <>
                <Btn onClick={()=>setPage(p=>p+1)} color="#2a3348" textColor="#e8ecf4" disabled={loading}>Next Page →</Btn>
                <span style={{fontSize:12,color:"#7a8ba6",alignSelf:"center"}}>{totalFound.toLocaleString()} total results</span>
              </>}
            </BtnRow>
          </Card>

          {results.length > 0 && (
            <Card title={`Results — ${results.length} contacts`}>
              <BtnRow>
                <Btn sm onClick={selectAll} color="#2a3348" textColor="#e8ecf4">☑️ Select All</Btn>
                <Btn sm onClick={clearAll} color="#2a3348" textColor="#e8ecf4">□ Clear</Btn>
                <Btn sm onClick={importSelected} color="#38c9a0" textColor="#0d1810" disabled={loading}>
                  📥 Import Selected ({selected.size})
                </Btn>
              </BtnRow>
              <div style={{overflowX:"auto",marginTop:12}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr>{["","Name","Role","Company","Country","Email",""].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"7px 10px",color:"#7a8ba6",borderBottom:"1px solid #2a3348",fontWeight:500}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {results.map((c,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid #1a2030",background:selected.has(String(i))?"#1a2d4a22":"transparent"}}>
                        <td style={{padding:"8px 10px"}}>
                          <input type="checkbox" checked={selected.has(String(i))} onChange={()=>toggleSelect(i)} />
                        </td>
                        <td style={{padding:"8px 10px",fontWeight:600}}>{c.first_name} {c.last_name}</td>
                        <td style={{padding:"8px 10px",color:"#7a8ba6"}}>{c.role}</td>
                        <td style={{padding:"8px 10px"}}>{c.company}</td>
                        <td style={{padding:"8px 10px",color:"#7a8ba6"}}>{c.country}</td>
                        <td style={{padding:"8px 10px"}}>
                          {c.email
                            ? <span style={{color:"#38c9a0"}}>{c.email}{c.email_confidence?` (${c.email_confidence}%)`:""}</span>
                            : <button onClick={()=>verifyEmail(i)} style={{background:"none",border:"1px solid #2a3348",color:"#f7a94f",borderRadius:4,padding:"2px 7px",fontSize:11,cursor:"pointer"}}>Find email</button>
                          }
                        </td>
                        <td style={{padding:"8px 10px"}}>
                          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#4f8ef7"}}>LinkedIn →</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── INDIVIDUAL MODE ── */}
      {mode === "individual" && (
        <Card title="👤 Individual Outreach">
          <Grid2>
            <div>
              <Label>First name</Label><input placeholder="Marie" value={indivContact.first_name} onChange={e=>setIndivContact(c=>({...c,first_name:e.target.value}))} />
              <Label>Last name</Label><input placeholder="Dupont" value={indivContact.last_name} onChange={e=>setIndivContact(c=>({...c,last_name:e.target.value}))} />
              <Label>Company</Label><input placeholder="Coolset" value={indivContact.company} onChange={e=>setIndivContact(c=>({...c,company:e.target.value}))} />
              <Label>Role</Label><input placeholder="Head of Sustainability" value={indivContact.role} onChange={e=>setIndivContact(c=>({...c,role:e.target.value}))} />
            </div>
            <div>
              <Label>Email</Label><input type="email" placeholder="marie@coolset.com" value={indivContact.email} onChange={e=>setIndivContact(c=>({...c,email:e.target.value}))} />
              <Label>LinkedIn URL</Label><input placeholder="linkedin.com/in/marie" value={indivContact.linkedin_url} onChange={e=>setIndivContact(c=>({...c,linkedin_url:e.target.value}))} />
              <Label>Channel</Label>
              <select value={indivChannel} onChange={e=>setIndivChannel(e.target.value)}>
                <option value="linkedin">💼 LinkedIn DM</option>
                <option value="email">📧 Email</option>
                <option value="call">📞 Phone Call</option>
              </select>
              <Label>Message</Label>
              <textarea style={{minHeight:100}} placeholder="Your personalised message..." value={indivMsg} onChange={e=>setIndivMsg(e.target.value)} />
            </div>
          </Grid2>
          <BtnRow>
            {indivChannel === "linkedin" && indivContact.linkedin_url && (
              <Btn onClick={()=>window.open(indivContact.linkedin_url,"_blank")} color="#0077b5" textColor="#fff">💼 Open LinkedIn Profile</Btn>
            )}
            {indivChannel === "email" && indivContact.email && (
              <Btn onClick={()=>window.open(`mailto:${indivContact.email}?subject=Quick question — SupplyMind AI&body=${encodeURIComponent(indivMsg)}`,"_blank")} color="#4f8ef7">📧 Open in Gmail</Btn>
            )}
            {indivChannel === "call" && (
              <Btn onClick={()=>alert("Log your call in the Tracker tab after.")} color="#38c9a0" textColor="#0d1810">📞 Log Call</Btn>
            )}
            <Btn onClick={async()=>{
              setLoading(true);
              await callEngine({ action:"import_contacts", contacts:[{...indivContact, source:"manual"}] });
              const {data:{user}} = await supabase.auth.getUser();
              if(user){ await supabase.from("activities").insert({ user_id:user.id, type: indivChannel==="email"?"Email":"LinkedIn", company:indivContact.company, note:`Reached out to ${indivContact.first_name} — ${indivMsg.slice(0,80)}` }); }
              setLog(`✅ Contact saved + activity logged`);
              await loadStats(); setLoading(false);
            }} color="#2a3348" textColor="#e8ecf4" disabled={loading}>✅ Save + Log</Btn>
          </BtnRow>
        </Card>
      )}

      {/* ── MASS EMAIL MODE ── */}
      {mode === "mass" && (
        <Card title="📧 Mass Email Campaign">
          <div style={{background:"#1a2d1a",border:"1px solid #38c9a055",borderRadius:7,padding:"10px 14px",fontSize:12,color:"#38c9a0",marginBottom:16}}>
            ✅ Sends to all contacts in your pipeline with an email address. Logs every send in Tracker.
            Uses your Gmail (contact.supplymindai@gmail.com) via mailto — opens your email client for bulk send.
          </div>
          <Label>Subject line</Label>
          <input value={massSubject} onChange={e=>setMassSubject(e.target.value)} />
          <Label>Email body — use {"{{first_name}}"}, {"{{company}}"}, {"{{role}}"} for personalisation</Label>
          <textarea style={{minHeight:200}} value={massBody} onChange={e=>setMassBody(e.target.value)} />
          <div style={{fontSize:11,color:"#7a8ba6",marginTop:8}}>
            💡 <strong>Best practices:</strong> Max 20/day · Send Tue–Thu 8–10am · Always include unsubscribe option · Personalise at least the first line
          </div>
          <BtnRow>
            <Btn onClick={sendMass} disabled={loading}>{loading?"Sending...":"📧 Send Mass Email"}</Btn>
            <Btn onClick={()=>{
              const preview = massBody.replace(/{{first_name}}/g,"Marie").replace(/{{company}}/g,"Coolset").replace(/{{role}}/g,"Head of Sustainability");
              alert(`PREVIEW (Marie @ Coolset):

Subject: ${massSubject}

${preview}`);
            }} color="#2a3348" textColor="#e8ecf4">👁️ Preview</Btn>
          </BtnRow>
        </Card>
      )}

      {/* ── FOLLOW-UP MODE ── */}
      {mode === "followup" && (
        <Card title="🔁 Schedule 4-Touch Follow-up Sequences">
          <div style={{background:"#1a1a2d",border:"1px solid #4f8ef755",borderRadius:7,padding:"10px 14px",fontSize:12,color:"#4f8ef7",marginBottom:16}}>
            Schedules a 4-touch sequence for all <strong>new</strong> contacts in your pipeline.
            Each sequence: Day 0 (LinkedIn) → Day 3 (LinkedIn DM) → Day 7 (Email) → Day 14 (Breakup).
            Go to the Generate tab to write the actual messages.
          </div>

          {/* Sequence timeline visual */}
          <div style={{display:"flex",gap:0,marginBottom:20,position:"relative"}}>
            {[
              {day:"Day 0",channel:"💼 LinkedIn",label:"Connection note"},
              {day:"Day 3",channel:"💬 LinkedIn DM",label:"Value message"},
              {day:"Day 7",channel:"📧 Email",label:"Cold email"},
              {day:"Day 14",channel:"📧 Breakup",label:"Final touch"},
            ].map((s,i)=>(
              <div key={i} style={{flex:1,textAlign:"center",position:"relative"}}>
                <div style={{height:2,background:"#2a3348",position:"absolute",top:16,left:i===0?"50%":"0",right:i===3?"50%":"0"}}/>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#1a2d4a",border:"2px solid #4f8ef7",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,margin:"0 auto 8px",position:"relative",zIndex:1}}>
                  {["1️⃣","2️⃣","3️⃣","4️⃣"][i]}
                </div>
                <div style={{fontSize:11,color:"#4f8ef7",fontWeight:700}}>{s.day}</div>
                <div style={{fontSize:11,color:"#e8ecf4"}}>{s.channel}</div>
                <div style={{fontSize:10,color:"#7a8ba6"}}>{s.label}</div>
              </div>
            ))}
          </div>

          <Grid2>
            <div>
              <Label>Tone</Label>
              <select value={fuTone} onChange={e=>setFuTone(e.target.value)}>
                <option value="founder">Founder-to-founder</option>
                <option value="consultative">Consultative</option>
                <option value="bold">Bold / challenger</option>
              </select>
            </div>
            <div>
              <Label>Pain point context</Label>
              <input placeholder="Manual CBAM tracking, 200+ suppliers..." value={fuPain} onChange={e=>setFuPain(e.target.value)} />
            </div>
          </Grid2>
          <BtnRow>
            <Btn onClick={scheduleFollowups} disabled={loading}>{loading?"Scheduling...":"🔁 Schedule Sequences for All New Contacts"}</Btn>
          </BtnRow>
          <div style={{fontSize:12,color:"#7a8ba6",marginTop:10}}>
            After scheduling → go to <strong>Generate tab</strong> → write the actual message for each touch → copy & send manually or via Mailmeteor.
          </div>
        </Card>
      )}
    </div>
  );
}
