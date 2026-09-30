import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { appendRow, readRange, rowsToObjects } from "@/lib/sheets";

export async function GET(){
  if(!googleConfigured()) return NextResponse.json({configured:false,cards:[]});
  const rows=await readRange(CONFIG.planilhaMaeId,`${CONFIG.tabs.kanban}!A1:AB1500`);
  return NextResponse.json({configured:true,cards:rowsToObjects(rows)});
}

export async function POST(req:NextRequest){
  if(!googleConfigured()) return NextResponse.json({ok:false,error:"Google Sheets não configurado."},{status:503});
  const body=await req.json();
  const now=new Date().toISOString();
  const row=[
    crypto.randomUUID(),
    body.idCaso||"",
    body.idOficio||"",
    body.titulo||"Nova diligência",
    body.tipoDiligencia||"INVESTIGACAO",
    body.descricao||"",
    now,
    now,
    body.prazo||"",
    body.prioridade||"MEDIA",
    body.status||"A_FAZER",
    body.etapa||"",
    body.equipe||"",
    body.responsavel||"",
    body.tipoProcedimento||"",
    body.numeroProcedimento||"",
    body.numOficio||"",
    body.destinatario||"",
    body.emailDestinatario||"",
    "","","","","","","",
    body.observacao||"",
    ""
  ];
  await appendRow(CONFIG.planilhaMaeId,`${CONFIG.tabs.kanban}!A:AB`,row);
  return NextResponse.json({ok:true,id:row[0]});
}
