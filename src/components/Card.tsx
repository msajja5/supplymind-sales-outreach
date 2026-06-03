import React from "react";

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{background:"#0d1117",border:"1px solid #2a3348",borderRadius:10,padding:20,marginBottom:20}}>
      {title && <h3 style={{margin:"0 0 16px",fontSize:15,color:"#e8ecf4",fontWeight:700}}>{title}</h3>}
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div style={{fontSize:12,fontWeight:600,color:"#7a8ba6",marginBottom:5,marginTop:8}}>{children}</div>;
}

export function Btn({
  children, onClick, disabled=false, color="#4f8ef7", textColor="#fff", sm=false
}: {
  children: React.ReactNode; onClick?: ()=>void; disabled?: boolean;
  color?: string; textColor?: string; sm?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? "6px 14px" : "9px 20px",
      background: disabled ? "#2a3348" : color,
      color: disabled ? "#7a8ba6" : textColor,
      border:"none", borderRadius:7, cursor: disabled?"not-allowed":"pointer",
      fontWeight:600, fontSize: sm?12:13, transition:"opacity .15s"
    }}>{children}</button>
  );
}

export function BtnRow({ children }: { children: React.ReactNode }) {
  return <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap",alignItems:"center"}}>{children}</div>;
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{children}</div>;
}

export function Empty({ msg }: { msg: string }) {
  return <div style={{textAlign:"center",padding:40,color:"#7a8ba6",fontSize:14}}>{msg}</div>;
}

export function StatBar({ items }: { items:{label:string;value:number|string;sub?:string}[] }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat("+items.length+",1fr)",gap:12,marginBottom:20}}>
      {items.map((it,i)=>(
        <div key={i} style={{background:"#0d1117",border:"1px solid #2a3348",borderRadius:9,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:"#4f8ef7"}}>{it.value}</div>
          <div style={{fontSize:12,color:"#e8ecf4",fontWeight:600,marginTop:2}}>{it.label}</div>
          {it.sub && <div style={{fontSize:11,color:"#7a8ba6"}}>{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function injectFormStyles() {
  if (document.getElementById("sm-global-styles")) return;
  const style = document.createElement("style");
  style.id = "sm-global-styles";
  const css = [
    "input, select, textarea {",
    "  width:100%; background:#161b25; border:1px solid #2a3348;",
    "  border-radius:6px; padding:9px 12px; color:#e8ecf4; font-size:13px;",
    "  outline:none; box-sizing:border-box; margin-bottom:10px; font-family:inherit;",
    "}",
    "input:focus, select:focus, textarea:focus { border-color:#4f8ef7; }",
    "textarea { resize:vertical; min-height:80px; }",
    "select { cursor:pointer; }",
  ].join("\n");
  style.textContent = css;
  document.head.appendChild(style);
}
