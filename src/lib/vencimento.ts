// Vencimento de uma conta num mês: o do próprio lançamento (quando foi
// alterado só naquele mês) ou o dia do cadastro aplicado à competência.

// "2026-02-01" + dia 31 -> "2026-02-28" (meses mais curtos ficam no último dia)
export function vencimentoPadrao(competencia: string, dia: number | null) {
  if (!dia) return null;
  const [ano, mes] = competencia.slice(0, 7).split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${competencia.slice(0, 7)}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

export function vencimentoEfetivo(competencia: string, vencimento: string | null, dia: number | null) {
  return vencimento ?? vencimentoPadrao(competencia, dia);
}

// Texto curto para a lista: "dia 12" no mês da conta; "vence 05/11" fora dele
export function rotuloVencimento(competencia: string, vencimento: string | null, dia: number | null) {
  const data = vencimentoEfetivo(competencia, vencimento, dia);
  if (!data) return null;
  if (data.slice(0, 7) === competencia.slice(0, 7)) return `dia ${Number(data.slice(8))}`;
  return `vence ${data.slice(8)}/${data.slice(5, 7)}`;
}
