import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { readRange, rowsToObjects } from "@/lib/sheets";

export async function POST(req:NextRequest){
  const body=await req.json();
  const flow=String(body.flow||"OFICIO_GENERICO");
  if(!googleConfigured()) return NextResponse.json({configured:false,missing:[],questions:[]});
  const rows=rowsToObjects(await readRange(CONFIG.baseInvestigativaId,"CAMPOS_OBRIGATORIOS!A1:H1000"))
    .filter(r=>r.CHAVE_FLUXO===flow && r.OBRIGATORIO==="SIM");
  const missing=rows.filter(r=>!String(body.data?.[r.CAMPO]||"").trim());
  return NextResponse.json({
    configured:true,
    missing:missing.map(r=>r.CAMPO),
    questions:missing.sort((a,b)=>Number(a.ORDEM)-Number(b.ORDEM)).map(r=>r.PERGUNTA_SE_FALTAR)
  });
}
