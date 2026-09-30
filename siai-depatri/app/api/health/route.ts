import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";

export async function GET(){
  return NextResponse.json({
    ok:true,
    google:googleConfigured(),
    openai:Boolean(process.env.OPENAI_API_KEY),
    numerator:Boolean(process.env.NUMERATOR_EXECUTOR_URL && process.env.NUMERATOR_EXECUTOR_TOKEN)
  });
}
