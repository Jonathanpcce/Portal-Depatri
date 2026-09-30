import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const instructions=`Você auxilia na redação de evoluções investigativas do NUIP/DEPATRI.
Regras obrigatórias:
- Preserve os fatos informados; não invente nomes, horários, locais, resultados ou declarações.
- Redija em português formal, técnico, objetivo e fluido.
- Não cite WhatsApp como origem no texto final.
- Quando um fato vier de declaração de terceiro, deixe isso claro.
- Se faltar informação essencial para tornar o trecho inteligível, não preencha: devolva perguntas objetivas.
- Não transforme hipótese em fato.
Retorne JSON com: texto_sugerido, perguntas_faltantes (array), fatos_confirmados (array), dados_terceiros (array), hipoteses (array).`;

export async function POST(req:NextRequest){
  if(!process.env.OPENAI_API_KEY) return NextResponse.json({configured:false,error:"OPENAI_API_KEY ainda não configurada."},{status:503});
  const {texto,contexto}=await req.json();
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
    model:process.env.OPENAI_MODEL||"gpt-6-astra",
    instructions,
    input:`CONTEXTO DO CASO:\n${contexto||"não informado"}\n\nEVOLUÇÃO BRUTA:\n${texto||""}\n\nResponda somente em JSON válido.`
  });
  let parsed:any;
  try{ parsed=JSON.parse(response.output_text); }
  catch{ parsed={texto_sugerido:response.output_text,perguntas_faltantes:[],fatos_confirmados:[],dados_terceiros:[],hipoteses:[]}; }
  return NextResponse.json({configured:true,...parsed});
}
