export const CONFIG = {
  planilhaMaeId: process.env.PLANILHA_MAE_ID || "1QBSBp8-Xo5chJgDY0723XUMOZnAHALd9L3A2JM2Tyxw",
  baseInvestigativaId: process.env.BASE_INVESTIGATIVA_ID || "1YWpIpHwNUlq9kXVn710nVe2dAG2zhCMAMDIQEk8I9Q0",
  pastaImagensRaizId: process.env.PASTA_IMAGENS_RAIZ_ID || "1X6JiyPbZR9Tz7pHih09jm2degIpdcFDi",
  pastaRtFinalId: process.env.PASTA_RT_FINAL_ID || "1tLaWO6AQVNGiNYf06vjiBzpcK4w6Jws1",
  pastaOficiosId: process.env.PASTA_OFICIOS_ID || "1yjMlFN7giIpNYQEwpN0U29_haPluPly6",
  modeloRtDocId: process.env.MODELO_RT_DOC_ID || "1WstQ9shY36U_W8j7i4vOkXRJH7ClA96o4nZIcLUrEt4",
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
