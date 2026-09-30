"use client";
import { useState } from "react";
import { Search, Plus, Mail, FolderKanban, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type Provider={id:string;nome:string;categoria:string;finalidade:string;observacao:string;status:string};

export default function InvestigacaoPage(){
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [data,setData]=useState<any>(null);
  const router=useRouter();

  async function analyze(){
    if(!input.trim()) return;
    setLoading(true);
    try{
      const r=await fetch("/api/investigacao/analisar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({input})});
      setData(await r.json());
    }finally{setLoading(false)}
  }

  async function addKanban(p:Provider){
    const body={
      titulo:"Verificar "+p.nome+" para "+(data?.detected?.type||"identificador"),
      tipoDiligencia:"AUXILIAR_INVESTIGACAO",
      descricao:"Analisar possibilidade de "+p.finalidade+" para o identificador "+(data?.detected?.value||input)+". "+p.observacao,
      status:"A_FAZER",
      prioridade:"MEDIA",
      observacao:"Sugestão criada pelo Auxiliar de Investigação; validar antes de qualquer ação externa."
    };
    const r=await fetch("/api/kanban",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    if(r.ok) alert("Diligência adicionada ao Kanban.");
    else alert("Não foi possível gravar no Kanban. Verifique a configuração Google.");
  }

  return <>
    <div className="page-head"><div><h1 className="page-title">Auxiliar de Investigação</h1><p className="page-sub">Informe um identificador ou ponto de partida. O sistema detecta o tipo e cruza com a Base Investigativa IA para sugerir caminhos documentados, sem tratar possibilidade como fato.</p></div></div>
    <div className="card">
      <div className="field"><label>Identificador ou ponto de partida</label><div className="toolbar"><div className="search"><Search size={18}/><input className="input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="Ex.: placa, telefone, e-mail, IMEI, CPF, IP..."/></div><button className="btn primary" onClick={analyze} disabled={loading}>{loading?"Analisando...":"Analisar"}</button></div></div>
    </div>

    {data&&<div style={{marginTop:18}} className="grid grid-2">
      <div className="result-block">
        <div className="result-title"><h3>Identificador detectado</h3><span className="badge info">{Math.round((data.detected?.confidence||0)*100)}%</span></div>
        <div className="metric-value" style={{fontSize:22}}>{data.detected?.type}</div>
        <div className="muted small" style={{marginTop:6,wordBreak:"break-all"}}>{data.detected?.value}</div>
        {!data.configured&&<div className="notice warn" style={{marginTop:14}}>A Base Investigativa já foi criada, mas a aplicação ainda precisa das credenciais Google no servidor para consultá-la em produção.</div>}
      </div>
      <div className="result-block">
        <div className="result-title"><h3>Regra de evidência</h3><AlertTriangle size={18}/></div>
        <div className="steps">
          <div className="step"><div className="step-num">F</div><p><strong>Fato confirmado</strong>: somente o que possui fonte ou confirmação objetiva.</p></div>
          <div className="step"><div className="step-num">H</div><p><strong>Hipótese</strong>: nunca é incorporada ao relatório como fato.</p></div>
          <div className="step"><div className="step-num">?</div><p><strong>A confirmar</strong>: vira diligência ou pergunta, não conclusão.</p></div>
        </div>
      </div>
    </div>}

    {data?.providers?.length>0&&<div style={{marginTop:18}} className="card flat">
      <div className="section-title">Caminhos encontrados</div>
      <div className="list">
        {data.providers.map((p:Provider)=><div className="list-row" key={p.id}>
          <div className="list-main">
            <div className="list-title">{p.nome}</div>
            <div className="list-sub">{p.categoria} · {p.finalidade}</div>
            {p.observacao&&<div className="small muted" style={{marginTop:7}}>{p.observacao}</div>}
          </div>
          <div className="toolbar">
            <span className={p.status?.includes("PENDENTE")?"badge warning":"badge success"}>{p.status||"SEM STATUS"}</span>
            <button className="btn secondary" onClick={()=>addKanban(p)}><FolderKanban size={15}/> Kanban</button>
            <button className="btn secondary" onClick={()=>router.push("/oficios?empresa="+encodeURIComponent(p.id)+"&identificador="+encodeURIComponent(data.detected.value))}><Mail size={15}/> Ofício</button>
          </div>
        </div>)}
      </div>
    </div>}
  </>;
}
