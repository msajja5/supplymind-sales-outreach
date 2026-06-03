export const Card = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <div style={{background:'#1e2535',border:'1px solid #2a3348',borderRadius:10,padding:20,marginBottom:20}}>
    {title && <div style={{fontSize:14,fontWeight:600,color:'#4f8ef7',marginBottom:14}}>{title}</div>}
    {children}
  </div>
)

export const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{fontSize:12,color:'#7a8ba6',display:'block',marginBottom:5,marginTop:12}}>{children}</label>
)

export const Btn = ({ children, onClick, color='#4f8ef7', textColor='#fff', disabled=false, sm=false }:
  { children: React.ReactNode; onClick?: ()=>void; color?: string; textColor?: string; disabled?: boolean; sm?: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    style={{display:'inline-flex',alignItems:'center',gap:7,padding:sm?'5px 12px':'9px 18px',
      borderRadius:7,border:'none',cursor:disabled?'not-allowed':'pointer',
      fontSize:sm?12:13,fontWeight:600,background:color,color:textColor,opacity:disabled?.6:1}}>
    {children}
  </button>
)

export const BtnRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>{children}</div>
)

export const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>{children}</div>
)

export const OutputBox = ({ text }: { text: string }) => (
  <div style={{background:'#161b25',border:'1px solid #2a3348',borderRadius:7,padding:14,
    fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',color:'#e8ecf4',marginTop:12,minHeight:60}}>
    {text}
  </div>
)

export const Empty = ({ msg='Nothing here yet.' }: { msg?: string }) => (
  <div style={{textAlign:'center',color:'#7a8ba6',padding:'40px 20px',fontSize:13}}>{msg}</div>
)

export const StatBar = ({ items }: { items: {label:string;value:number;sub:string}[] }) => (
  <div style={{display:'flex',gap:16,marginBottom:20,flexWrap:'wrap'}}>
    {items.map(i => (
      <div key={i.label} style={{background:'#1e2535',border:'1px solid #2a3348',borderRadius:10,padding:'14px 20px',flex:1,minWidth:120}}>
        <div style={{fontSize:11,color:'#7a8ba6',marginBottom:4}}>{i.label}</div>
        <div style={{fontSize:24,fontWeight:700,color:'#4f8ef7'}}>{i.value}</div>
        <div style={{fontSize:11,color:'#38c9a0',marginTop:2}}>{i.sub}</div>
      </div>
    ))}
  </div>
)
