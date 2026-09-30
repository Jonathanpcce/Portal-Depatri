"use client";
import { useEffect, useMemo, useState } from "react";
import { Database, Search, ShieldCheck } from "lucide-react";

export default function BasePage(){
  const [data,setData]=useState<any>({empresas:[],identificadores:[],configured:true});
  const [q,setQ]=useState("");
  useEffect(()=>{fetch("/api/base").then(r=>r.json()).then(setData).catch(()=>setData({empresas:[],identificadores:[],configured:false}))},[]);
  const empresas=useMemo(()=>data.empresas.filter((e:any)=>JSON.stringify(e).toLowerCase().includes(q.toLowerCase())),[data,q]);
  return <>
    <div className="page-head"><div><h1 className="page-title">Base Investigativa IA</h1><p className="page-sub">Base separada da planilha-mãe para empresas, identificadores, canais, tipos de requisição, campos obrigatórios, fontes e regras do assistente.</p></div><span className="badge success"><ShieldCheck size={13}/> Separada da operação</span></div>
    {!data.configured&&<div className="notice warn" style={{marginBottom:16}}>A planilha já existe; faltam apenas as credenciais do servidor para a aplicação consultá-la.</div>}
    <div className="card flat">
      <div className="toolbar" style={{marginBottom:14}}><div className="search"><Search size={17}/><input className="input" placeholder="Pesquisar empresa, categoria, alias..." value={q} onChange={e=>setQ(e.target.value)}/></div><span className="badge info"><Database size={13}/>{empresas.length} empresas</span></div>
      <div className="list">
        {empresas.map((e:any)=><div className="list-row" key={e.ID_EMPRESA}><div className="list-main"><div className="list-title">{e.NOME}</div><div className="list-sub">{e.CATEGORIA} {e.ALIASES?"· "+e.ALIASES:""}</div>{e.OBSERVACAO&&<div className="small muted" style={{marginTop:7}}>{e.OBSERVACAO}</div>}</div><span className={String(e.STATUS_VERIFICACAO).includes("PENDENTE")?"badge warning":"badge success"}>{e.STATUS_VERIFICACAO}</span></div>)}
      </div>
    </div>
  </>;
}
