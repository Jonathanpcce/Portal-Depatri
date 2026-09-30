import { BrainCircuit, FileText, Mail, FolderKanban, Search, ShieldCheck, Database, Files } from "lucide-react";
import Link from "next/link";

export default function Home(){
  return <>
    <div className="page-head">
      <div><h1 className="page-title">Sistema Inteligente de Apoio à Investigação</h1><p className="page-sub">Casos, evoluções, RT, ofícios, Kanban e auxílio investigativo em uma interface única, preservando a planilha-mãe como fonte operacional oficial.</p></div>
      <span className="badge success"><ShieldCheck size={13}/> Arquitetura institucional</span>
    </div>

    <section className="hero">
      <div>
        <span className="badge info"><BrainCircuit size={13}/> Assistente contextual</span>
        <h2 style={{marginTop:12}}>Comece pelo que você tem.</h2>
        <p>Informe uma placa, telefone, e-mail, IMEI, CPF, IP ou descreva a situação. O sistema identifica caminhos possíveis, aponta o que falta e permite transformar uma sugestão em diligência, ofício ou card no Kanban.</p>
        <div className="toolbar">
          <Link className="btn primary" href="/investigacao"><Search size={17}/> Analisar identificador</Link>
          <Link className="btn secondary" href="/casos"><Files size={17}/> Abrir casos</Link>
        </div>
      </div>
      <div className="hero-panel">
        <div className="section-title">Regras centrais</div>
        <div className="steps">
          <div className="step"><div className="step-num">1</div><p>Não inventar informação. Se faltar dado essencial, perguntar.</p></div>
          <div className="step"><div className="step-num">2</div><p>Separar fato confirmado, dado de terceiro, hipótese e pendência.</p></div>
          <div className="step"><div className="step-num">3</div><p>RT e ofício usam os numeradores e registros da planilha-mãe.</p></div>
          <div className="step"><div className="step-num">4</div><p>Ações externas não são disparadas sem confirmação humana.</p></div>
        </div>
      </div>
    </section>

    <div className="grid grid-4" style={{marginTop:18}}>
      {[
        ["Casos","Contexto e evoluções",Files,"/casos"],
        ["Relatório Técnico","Prévia, pasta e geração",FileText,"/rt"],
        ["Ofícios","Modelos e geração inteligente",Mail,"/oficios"],
        ["Kanban","Diligências e pendências",FolderKanban,"/kanban"]
      ].map(([t,s,Ic,href]:any)=><Link href={href} className="card metric" key={t}><div><div className="metric-value" style={{fontSize:18}}>{t}</div><div className="metric-label">{s}</div></div><div className="metric-icon"><Ic size={20}/></div></Link>)}
    </div>

    <div className="grid grid-2" style={{marginTop:18}}>
      <div className="card"><div className="section-title">Dados oficiais</div><p className="muted small">Planilha-mãe: casos, evoluções, numeradores, RT, ofícios, Kanban e pendências.</p><div className="divider"/><p className="muted small">Base Investigativa IA: empresas, identificadores, canais, campos obrigatórios, fontes e regras.</p></div>
      <div className="card"><div className="section-title">Próxima ação rápida</div><div className="toolbar"><Link className="btn secondary" href="/rt"><FileText size={16}/> Novo RT</Link><Link className="btn secondary" href="/oficios"><Mail size={16}/> Novo ofício</Link><Link className="btn secondary" href="/base"><Database size={16}/> Abrir base</Link></div></div>
    </div>
  </>;
}
