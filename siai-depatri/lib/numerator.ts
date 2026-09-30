export async function consumeNumber(tipo: "RELATORIO TECNICO" | "OFICIO", ano = new Date().getFullYear()) {
  const url = process.env.NUMERATOR_EXECUTOR_URL;
  const token = process.env.NUMERATOR_EXECUTOR_TOKEN;
  if (!url || !token) {
    throw new Error("Executor atômico do numerador não configurado. A geração final foi bloqueada para evitar duplicidade.");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "increment", tipo, ano }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Falha ao consumir numerador oficial.");
  return res.json() as Promise<{ numero: number; ano: number }>;
}
