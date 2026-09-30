import { NextRequest, NextResponse } from "next/server";
import { driveClient, googleConfigured } from "@/lib/google";
import { CONFIG } from "@/lib/constants";

function safeName(v:string){ return v.replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim(); }

export async function POST(req:NextRequest){
  if(!googleConfigured()) return NextResponse.json({ok:false,error:"Google Drive não configurado."},{status:503});
  const {identificador}=await req.json();
  if(!identificador) return NextResponse.json({ok:false,error:"Identificador do caso é obrigatório."},{status:400});
  const drive=driveClient();
  const name=`EM ELABORACAO - IMAGENS - ${safeName(String(identificador))}`;
  const found=await drive.files.list({
    q:`'${CONFIG.pastaImagensRaizId}' in parents and name = '${name.replace(/'/g,"\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields:"files(id,name,webViewLink)"
  });
  let folder=found.data.files?.[0];
  if(!folder){
    const created=await drive.files.create({
      requestBody:{name,mimeType:"application/vnd.google-apps.folder",parents:[CONFIG.pastaImagensRaizId]},
      fields:"id,name,webViewLink"
    });
    folder=created.data;
    await drive.permissions.create({
      fileId:folder.id!,
      requestBody:{type:"anyone",role:"reader"},
      fields:"id"
    });
  }
  return NextResponse.json({ok:true,id:folder.id,url:folder.webViewLink,name:folder.name,permission:"reader"});
}
