const STEPS = [
  { title:'1 · Apollo.io — Build your target list', color:'#4f8ef7', url:'https://apollo.io',
    body:`Go to apollo.io → Sign up free → People search → Filters: Title contains "CBAM" OR "ESG" OR "Sustainability" OR "Trade Compliance" → Country: Netherlands, Belgium, Germany → Company size: 10–500. Export up to 10 contacts manually on free plan. Use Chrome extension to find emails instantly.` },
  { title:'2 · Hunter.io — Verify emails', color:'#38c9a0', url:'https://hunter.io',
    body:`hunter.io → Domain search → enter target company URL → see all indexed emails + confidence score. Install Chrome extension → visit LinkedIn profile → click extension → get email. 50 free searches/month.
⚠️ Only email contacts with 80%+ confidence score.` },
  { title:'3 · Apify — Scrape LinkedIn company pages', color:'#f7a94f', url:'https://apify.com',
    body:`apify.com → Sign up free ($5 credit) → Store → search "LinkedIn Company Scraper" → paste LinkedIn URLs for Sentra.world, Sami.eco, Coolset, Plan A, Zevero → Run → Download CSV. Filter: Head of, Director, Manager, BD, Partnerships. Cross-reference with Hunter.io.` },
  { title:'4 · Mailmeteor — Personalised email sending', color:'#4f8ef7', url:'https://mailmeteor.com',
    body:`mailmeteor.com → Install Google Sheets add-on (free) → Create sheet: First name, Company, Email, Custom line → Use mail merge from Gmail. Free: 50 emails/day.
⚠️ Never send more than 20/day to protect sender reputation.` },
  { title:'5 · LinkedIn — Manual warm outreach rules', color:'#38c9a0', url:'https://linkedin.com',
    body:`• Max 20 connection requests/week (free account limit)
• Always add personalised note (200 char max)
• Comment on 5 posts/day before sending requests — warm the algorithm
• Search: "CBAM" + Netherlands → Posts tab → posted in last 30 days = warmest targets` },
  { title:'6 · Use this cockpit every session', color:'#f7a94f', url:'',
    body:`• Generate tab: write every message here first. Paste their post topic to personalise.
• Sequence tab: generate all 4 touches for a new contact in one go.
• Contacts tab: log every target. Never let a lead go cold untracked.
• Tracker tab: log every action daily. Discipline is everything.` },
]

export default function Guide() {
  return (
    <div>
      <div style={{background:'#1e2535',border:'1px solid #2a3348',borderRadius:10,padding:20}}>
        <div style={{fontSize:14,fontWeight:600,color:'#4f8ef7',marginBottom:16}}>📋 Free Tool Stack — Setup Guide</div>
        {STEPS.map((s,i) => (
          <div key={i} style={{borderLeft:`3px solid ${s.color}`,padding:'12px 16px',marginBottom:14,background:'#161b25',borderRadius:'0 7px 7px 0'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.title}</span>
              {s.url && <a href={s.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#7a8ba6',border:'1px solid #2a3348',borderRadius:4,padding:'2px 7px',textDecoration:'none'}}>Open →</a>}
            </div>
            <p style={{fontSize:13,color:'#7a8ba6',lineHeight:1.7,whiteSpace:'pre-line'}}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
