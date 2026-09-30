function required(name:string){
  const value=process.env[name];
  if(!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const CONFIG = {
  get planilhaMaeId(){ return required("PLANILHA_MAE_ID"); },
  get baseInvestigativaId(){ return required("BASE_INVESTIGATIVA_ID"); },
  get pastaImagensRaizId(){ return required("PASTA_IMAGENS_RAIZ_ID"); },
  get pastaRtFinalId(){ return required("PASTA_RT_FINAL_ID"); },
  get pastaOficiosId(){ return required("PASTA_OFICIOS_ID"); },
  get modeloRtDocId(){ return required("MODELO_RT_DOC_ID"); },
  tabs: {
    numerador: "INTEL_NUMERADOR",
    oficios: "INTEL_OFICIOS",
    kanban: "KANBAN_DILIGENCIAS",
    pendenciasOficios: "PENDENCIAS_OFICIOS",
    evolucoes: "INVEST_EVOLUCOES",
    usuarios: "USUARIOS"
  }
} as const;

export const KANBAN_COLUMNS = [
  { id: "A_FAZER", label: "A fazer" },
  { id: "EM_ANDAMENTO", label: "Em andamento" },
  { id: "AGUARDANDO_TERCEIRO", label: "Aguardando terceiro" },
  { id: "PARA_REVISAR", label: "Para revisar" },
  { id: "CONCLUIDO", label: "Concluído" }
] as const;
