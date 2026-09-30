import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/constants";
import { googleConfigured } from "@/lib/google";
import { readRange, rowsToObjects } from "@/lib/sheets";

export async function GET(){
  if(!googleConfigured()) return NextResponse.json({configured:false,empresas:[],identificadores:[]});
  const [e,i]=await Promise.all([
    readRange(CONFIG.baseInvestigativaId,"EMPRESAS!A1:H500"),
    readRange(CONFIG.baseInvestigativaId,"IDENTIFICADORES!A1:H1000")
  ]);
  return NextResponse.json({configured:true,empresas:rowsToObjects(e),identificadores:rowsToObjects(i)});
}
