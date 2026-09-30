"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, FileText, FolderOpen } from "lucide-react";

type CaseItem={numero:string;crime:string;equipe:string;status:string;difusao:string;data:string;rt:string;linkImagens:string};

export default function CasosPage(){
  const [items,setItems]=useState<CaseItem[]>([]);
  const [q,setQ]=useState("");
  const [configured,setConfigured]=useState(true);
  useEffect(()=>{fetch("/api/cases").then(r=>r.json()).then(d=>{setItems(d.cases||[]);setConfigured(d.configured!==false)}).catch(()=>setConfigured(false))},[]);
  const filtered=useMemo(()=>items.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase())),[items,q]);
  return <>
    <div className="page-head"><div><h1 className="page-title">Casos</h1><p className="page-sub">Consulta consolidada das ocorrências registradas na planilha-mãe. A interface não cria um banco paralelo para os dados operacionais.</p></div></div>
    {!configured&&<div className="notice warn" style={{marginBottom:16}}>A interface está pronta, mas as credenciais Google do servidor ainda não foram configuradas.</div>}
    <div className="card flat">
      <div className="toolbar" style={{marginBottom:14}}><div className="search"><Search size={17}/><input className="input" placeholder="Pesquisar ocorrência, crime, equipe, difusão..." value={q} onChange={e=>setQ(e.target.value)}/></div><span className="badge info">{filtered.length} casos</span></div>
      <div className="list">
        {filtered.map(c=><div className="list-row" key={c.numero}>
          <div className="list-main"><div className="list-title">{c.numero}</div><div className="list-sub">{c.crime||"Crime não informado"} · {c.equipe||"Equipe não informada"} {c.difusao ? "· "+c.difusao : ""}</div></div>
          <div className="toolbar">{c.rt&&<span className="badge success">RT {c.rt}</span>}{c.status&&<span className="badge">{c.status}</span>}{c.linkImagens&&<a className="btn secondary" href={c.linkImagens} target="_blank"><FolderOpen size={15}/> Imagens</a>}<a className="btn secondary" href={"/rt?caso="+encodeURIComponent(c.numero)}><FileText size={15}/> Abrir RT</a></div>
        </div>)}
        {!filtered.length&&<div className="notice">Nenhum caso encontrado para o filtro atual.</div>}
      </div>
    </div>
  </>;
}
