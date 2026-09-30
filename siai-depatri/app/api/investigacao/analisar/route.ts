import { NextRequest, NextResponse } from "next/server";
import { detectIdentifier } from "@/lib/identifiers";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { readRange, rowsToObjects } from "@/lib/sheets";

export async function POST(req:NextRequest){
  const {input}=await req.json();
  const detected=detectIdentifier(String(input||""));
  if(!googleConfigured()) return NextResponse.json({configured:false,detected,providers:[],message:"Google Sheets ainda não configurado no servidor."});
  const [ids,empresas]=await Promise.all([
    readRange(CONFIG.baseInvestigativaId,"IDENTIFICADORES!A1:H1000"),
    readRange(CONFIG.baseInvestigativaId,"EMPRESAS!A1:H500")
  ]);
  const idRows=rowsToObjects(ids).filter(r=>r.IDENTIFICADOR===detected.type);
  const empRows=rowsToObjects(empresas);
  const providers=idRows.map(r=>{
    const e=empRows.find(x=>x.ID_EMPRESA===r.EMPRESA_ID);
    return {
      id:r.EMPRESA_ID,
      nome:e?.NOME||r.EMPRESA_ID,
      categoria:e?.CATEGORIA||"",
      finalidade:r.FINALIDADE||"",
      observacao:r.OBSERVACAO||"",
      status:e?.STATUS_VERIFICACAO||r.STATUS||""
    };
  });
  return NextResponse.json({configured:true,detected,providers});
}
