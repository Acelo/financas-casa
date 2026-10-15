const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(valor: number | string | null | undefined) {
  return brl.format(Number(valor ?? 0));
}

// Competência no formato "AAAA-MM" -> data do dia 1 ("AAAA-MM-01")
export function competenciaParaData(mes: string) {
  return `${mes}-01`;
}

// Mês corrente no fuso de Brasília (o servidor da Vercel roda em UTC)
export function mesAtual() {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
    .slice(0, 7);
}

// Lê ?mes=AAAA-MM da URL; se ausente ou inválido, usa o mês corrente
export function lerMes(param: string | string[] | undefined) {
  return typeof param === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(param)
    ? param
    : mesAtual();
}

export function nomeDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number);
  const nome = new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function somarMeses(mes: string, delta: number) {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
