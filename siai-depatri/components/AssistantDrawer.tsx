"use client";
import { useEffect, useState } from "react";
import { BrainCircuit, X, Send } from "lucide-react";

export default function AssistantDrawer(){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  useEffect(()=>{
    const fn=()=>setOpen(true);
    window.addEventListener("open-siai-chat",fn);
    return()=>window.removeEventListener("open-siai-chat",fn);
  },[]);
  if(!open) return null;
  return <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(4,10,18,.38)"}} onClick={()=>setOpen(false)}>
    <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:"min(460px,92vw)",background:"var(--surface)",borderLeft:"1px solid var(--border)",padding:18,boxShadow:"var(--shadow)",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><BrainCircuit size={22}/><div><strong>Assistente Investigativo</strong><div className="small muted">Contextual ao módulo atual</div></div></div>
        <button className="icon-btn" onClick={()=>setOpen(false)}><X/></button>
      </div>
      <div className="divider"/>
      <div className="notice">A IA diferencia fatos confirmados, dados de terceiros, hipóteses e pendências. Ações externas sempre exigem confirmação humana.</div>
      <div style={{flex:1}}/>
      <div className="field"><textarea className="textarea" value={text} onChange={e=>setText(e.target.value)} placeholder="Descreva o que você tem ou pergunte como evoluir a investigação..."/></div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button className="btn primary" disabled={!text.trim()}><Send size={16}/> Enviar</button></div>
    </div>
  </div>
}
