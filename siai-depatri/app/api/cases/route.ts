import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { readRange, rowsToObjects } from "@/lib/sheets";

export async function GET(){
  if(!googleConfigured()) return NextResponse.json({configured:false,cases:[]});
  const rows=await readRange(CONFIG.planilhaMaeId,`${CONFIG.tabs.evolucoes}!A1:AD1000`);
  const items=rowsToObjects(rows);
  const map=new Map<string,Record<string,string>>();
  for(const r of items){
    const key=r.NUM_OCORRENCIA?.trim();
    if(!key) continue;
    const prev=map.get(key)||{};
    map.set(key,{...prev,...r});
  }
  const cases=[...map.values()].map(r=>({
    numero:r.NUM_OCORRENCIA,
    crime:r.CRIME||r.TIPO_OCORRENCIA||"",
    equipe:r.EQUIPE||"",
    status:r.STATUS||"",
    difusao:r.DIFUSAO||"",
    data:r.DATA||r.DATA_CRIACAO||"",
    rt:r.NUM_RT||r.NUMERO_RT||"",
    linkImagens:r.LINK_DRIVE_IMAGENS||""
  })).reverse();
  return NextResponse.json({configured:true,cases});
}
