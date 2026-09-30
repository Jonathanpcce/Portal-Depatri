"use client";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { KANBAN_COLUMNS } from "@/lib/constants";

type Card=Record<string,string>;

export default function KanbanPage(){
  const [cards,setCards]=useState<Card[]>([]);
  const [configured,setConfigured]=useState(true);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await fetch("/api/kanban",{cache:"no-store"});
      const d=await r.json();
      setCards(d.cards||[]);
      setConfigured(d.configured!==false);
    }finally{setLoading(false)}
  }

  useEffect(()=>{load()},[]);
  const grouped=useMemo(()=>Object.fromEntries(KANBAN_COLUMNS.map(c=>[c.id,cards.filter(x=>(x.STATUS_KANBAN||"A_FAZER")===c.id)])),[cards]);

  return <>
    <div className="page-head">
      <div><h1 className="page-title">Kanban</h1><p className="page-sub">Quadro visual ligado à aba KANBAN_DILIGENCIAS da planilha-mãe.</p></div>
      <button className="btn secondary" onClick={load}><RefreshCw size={16}/> Atualizar</button>
    </div>
    {!configured&&<div className="notice warn" style={{marginBottom:16}}>Credenciais Google ainda não configuradas no servidor.</div>}
    <div className="kanban">
      {KANBAN_COLUMNS.map(col=><section className="kanban-col" key={col.id}>
        <div className="kanban-head"><span>{col.label}</span><span className="badge">{grouped[col.id]?.length||0}</span></div>
        {grouped[col.id]?.map((c:Card,index:number)=><article className="kanban-card" key={c.ID_DILIGENCIA||String(index)}>
          <h4>{c.TITULO||"Diligência"}</h4>
          <p>{c.DESCRICAO||"Sem descrição"}</p>
          <div className="kanban-meta">
            {c.PRIORIDADE&&<span className={c.PRIORIDADE==="ALTA"?"badge danger":"badge"}>{c.PRIORIDADE}</span>}
            {c.EQUIPE&&<span className="badge info">{c.EQUIPE}</span>}
            {c.NUM_OFICIO&&<span className="badge success">OF {c.NUM_OFICIO}</span>}
          </div>
        </article>)}
        {!grouped[col.id]?.length&&!loading&&<div className="small muted">Sem cards nesta etapa.</div>}
      </section>)}
    </div>
  </>;
}
