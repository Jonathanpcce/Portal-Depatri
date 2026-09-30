import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { readRange, rowsToObjects } from "@/lib/sheets";

const map:Record<string,string>={
  OF_IMAGENS:"OF_IMAGENS",
  OF_PROVEDOR_IP:"OF_PROVEDOR_INTERNET",
  OF_TELEFONIA:"OF_TELEFONIA",
  OF_LOCADORA_PLACA:"OF_LOC_PLACA"
};

export async function POST(req:NextRequest){
  if(!process.env.OPENAI_API_KEY) return NextResponse.json({configured:false,error:"OPENAI_API_KEY ainda não configurada."},{status:503});
  const body=await req.json();
  let reference="";
  if(googleConfigured() && map[body.flow]){
    const rows=rowsToObjects(await readRange(CONFIG.planilhaMaeId,"DB_TEXTOS_DOCS!A1:E100"));
    const found=rows.find(r=>r.IDENTIFICADOR===map[body.flow]);
    reference=found?.TEXTO_BASE||"";
  }
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
    model:process.env.OPENAI_MODEL||"gpt-6-astra",
    instructions:"Redija somente o corpo de um ofício institucional do DEPATRI/PCCE, em português formal. Preserve os fatos fornecidos, não invente dados, datas, identificadores, fundamentos jurídicos ou destinatários. Se faltar informação essencial, retorne perguntas em vez de completar por conta própria. Mantenha tom formal e objetivo. Retorne JSON válido com corpo e perguntas_faltantes.",
    input:"FLUXO: "+String(body.flow||"OFICIO_GENERICO")+"\nEMPRESA: "+String(body.empresa||"")+"\nDADOS: "+JSON.stringify(body.data||{})+"\nMODELO DE REFERÊNCIA, SE HOUVER:\n"+reference
  });
  let parsed:any;
  try{parsed=JSON.parse(response.output_text)}catch{parsed={corpo:response.output_text,perguntas_faltantes:[]}}
  return NextResponse.json({configured:true,...parsed});
}
