// Saldo e rendimento das reservas (caixinhas).
//
// Saldo registrado = soma dos movimentos (resgate subtrai, o resto soma).
// Rendimento estimado: a partir da última "âncora" (saldo inicial ou
// atualização de saldo, quando o valor bate com o banco), aplica dia a dia a
// taxa do CDI publicada pelo Banco Central sobre o saldo, incluindo os
// aportes e resgates feitos depois da âncora. É o rendimento BRUTO: o banco
// desconta IR/IOF só no resgate, então o saldo bruto é o que aparece no app.

export type Indexador = "cdi" | "prefixado" | "nenhum";
export type TipoMovimento = "saldo_inicial" | "aporte" | "resgate" | "rendimento";

export type Movimento = {
  id: string;
  reserva_id: string;
  data: string; // AAAA-MM-DD
  tipo: TipoMovimento;
  valor: number;
  descricao: string | null;
};

export type TaxaDia = { data: string; taxa: number }; // taxa em % ao dia

export function comSinal(m: Pick<Movimento, "tipo" | "valor">) {
  return m.tipo === "resgate" ? -Number(m.valor) : Number(m.valor);
}

export function saldoRegistrado(movs: Movimento[], ate?: string) {
  return movs
    .filter((m) => !ate || m.data <= ate)
    .reduce((s, m) => s + comSinal(m), 0);
}

// Série 12 do SGS/BCB: CDI diário (% ao dia), um registro por dia útil
export async function buscarCDI(de: string): Promise<TaxaDia[] | null> {
  const br = (iso: string) => iso.split("-").reverse().join("/");
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${br(de)}&dataFinal=${br(hoje)}`;
  try {
    const resp = await fetch(url, { next: { revalidate: 6 * 3600 } });
    if (!resp.ok) return null;
    const dados: { data: string; valor: string }[] = await resp.json();
    return dados.map((d) => ({
      data: d.data.split("/").reverse().join("-"),
      taxa: Number(d.valor),
    }));
  } catch {
    return null;
  }
}

function proximoDia(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function diaUtilSimples(iso: string) {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6;
}

export type Estimativa = {
  estimado: number;
  rendimento: number; // estimado - registrado
  desde: string; // data da âncora
  taxaAte: string | null; // última taxa publicada usada
};

export function estimar(
  indexador: Indexador,
  taxa: number | null,
  movs: Movimento[],
  cdi: TaxaDia[] | null,
  hoje: string,
): Estimativa | null {
  if (indexador === "nenhum" || !taxa || !cdi?.length) return null;

  const ordenados = [...movs].sort((a, b) => a.data.localeCompare(b.data));
  const ancora = ordenados.filter((m) => m.tipo === "saldo_inicial" || m.tipo === "rendimento").at(-1);
  if (!ancora) return null;

  const fatorDia = (taxaCdi: number) =>
    indexador === "cdi"
      ? (taxaCdi / 100) * (taxa / 100)
      : (1 + taxa / 100) ** (1 / 252) - 1; // prefixado: % a.a. em 252 dias úteis

  const taxas = new Map(cdi.map((t) => [t.data, t.taxa]));
  const ultimaPublicada = cdi.at(-1)!;

  let saldo = saldoRegistrado(ordenados, ancora.data);
  const pendentes = ordenados.filter((m) => m.data > ancora.data);
  let p = 0;

  // A taxa do dia D rende de D para D+1: o saldo de hoje inclui até ontem
  for (let d = ancora.data; d < hoje; d = proximoDia(d)) {
    while (p < pendentes.length && pendentes[p].data <= d) saldo += comSinal(pendentes[p++]);

    let taxaCdi = taxas.get(d);
    // Dias ainda sem taxa publicada (o BCB publica com 1 dia de atraso):
    // usa a última taxa conhecida em dias de semana
    if (taxaCdi === undefined && d > ultimaPublicada.data && diaUtilSimples(d)) {
      taxaCdi = ultimaPublicada.taxa;
    }
    if (taxaCdi !== undefined && saldo > 0) saldo *= 1 + fatorDia(taxaCdi);
  }
  while (p < pendentes.length && pendentes[p].data <= hoje) saldo += comSinal(pendentes[p++]);

  const estimado = Math.round(saldo * 100) / 100;
  const registrado = saldoRegistrado(ordenados, hoje);
  return {
    estimado,
    rendimento: Math.round((estimado - registrado) * 100) / 100,
    desde: ancora.data,
    taxaAte: ultimaPublicada.data,
  };
}

export function descreverTaxa(indexador: Indexador, taxa: number | null) {
  if (indexador === "nenhum" || taxa === null) return "Sem rendimento";
  const t = Number(taxa).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return indexador === "cdi" ? `${t}% do CDI` : `${t}% ao ano`;
}
