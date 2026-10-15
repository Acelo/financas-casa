// Saldo e rendimento das reservas (caixinhas).
//
// Saldo registrado = soma dos movimentos (resgate subtrai, o resto soma).
// Rendimento estimado: a partir da última "âncora" (saldo inicial ou
// atualização de saldo, quando o valor bate com o banco), aplica dia a dia a
// taxa do CDI publicada pelo Banco Central sobre o saldo, incluindo os
// aportes e resgates feitos depois da âncora. O saldo é BRUTO (o banco
// desconta IR/IOF só no resgate); o líquido estimado aplica a tabela
// regressiva de IR e o IOF sobre o ganho de cada lote (aporte).

export type Indexador = "cdi" | "prefixado" | "nenhum";
export type TipoMovimento = "saldo_inicial" | "aporte" | "resgate" | "rendimento";

export type Movimento = {
  id: string;
  reserva_id: string;
  data: string; // AAAA-MM-DD
  tipo: TipoMovimento;
  valor: number;
  descricao: string | null;
  valor_liquido?: number | null; // saldo líquido informado (âncoras)
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
  estimado: number; // bruto
  rendimento: number; // estimado - registrado
  liquido: number; // bruto - IR - IOF, se resgatasse tudo hoje
  impostos: number; // IR + IOF estimados
  baseInformada: boolean; // a âncora tem o líquido informado pelo banco
  desde: string; // data da âncora
  taxaAte: string | null; // última taxa publicada usada
};

// IR regressivo de renda fixa, sobre o ganho, pela idade da aplicação
export function aliquotaIR(dias: number) {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.2;
  if (dias <= 720) return 0.175;
  return 0.15;
}

// IOF regressivo sobre o ganho nos primeiros 29 dias (zera no 30º)
const IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3];
export function aliquotaIOF(dias: number) {
  return dias >= 1 && dias <= 29 ? IOF[dias - 1] / 100 : dias < 1 ? 1 : 0;
}

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

// Lote: um pedaço do saldo com data de aplicação própria (para IR/IOF)
type Lote = { data: string; principal: number; valor: number; irBase: number };

// Resgate sai dos lotes mais antigos primeiro (como faz o banco)
function resgatar(lotes: Lote[], quanto: number) {
  for (const l of lotes) {
    if (quanto <= 0) break;
    if (l.valor <= 0) continue;
    const tira = Math.min(quanto, l.valor);
    const resta = 1 - tira / l.valor;
    l.principal *= resta;
    l.irBase *= resta;
    l.valor -= tira;
    quanto -= tira;
  }
}

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

  // Imposto já embutido no saldo até a âncora. Quando o banco informou o
  // líquido, é exato (bruto - líquido). Sem isso, cada rendimento lançado
  // soma 22,5% (alíquota mais alta, para não superestimar o líquido).
  let bal = 0;
  let irBase = 0;
  for (const m of ordenados.filter((x) => x.data <= ancora.data)) {
    if (m.tipo === "resgate") {
      irBase *= bal > 0 ? Math.max(0, 1 - Number(m.valor) / bal) : 0;
      bal -= Number(m.valor);
    } else {
      bal += Number(m.valor);
    }
    if ((m.tipo === "saldo_inicial" || m.tipo === "rendimento") && m.valor_liquido != null) {
      irBase = Math.max(0, bal - Number(m.valor_liquido));
    } else if (m.tipo === "rendimento") {
      irBase += Math.max(0, Number(m.valor)) * 0.225;
    }
  }

  // O saldo da âncora vira o primeiro lote; cada aporte depois dela, outro.
  // Como a idade real do dinheiro antigo não é conhecida, o ganho novo sobre
  // ele conta a partir da âncora (alíquota maior = estimativa conservadora).
  const lotes: Lote[] = [{ data: ancora.data, principal: bal, valor: bal, irBase }];
  const pendentes = ordenados.filter((m) => m.data > ancora.data);
  let p = 0;
  const aplicar = (ate: string) => {
    while (p < pendentes.length && pendentes[p].data <= ate) {
      const m = pendentes[p++];
      const v = Number(m.valor);
      if (m.tipo === "resgate") resgatar(lotes, v);
      else lotes.push({ data: m.data, principal: v, valor: v, irBase: 0 });
    }
  };

  // A taxa do dia D rende de D para D+1: o saldo de hoje inclui até ontem
  for (let d = ancora.data; d < hoje; d = proximoDia(d)) {
    aplicar(d);
    let taxaCdi = taxas.get(d);
    // Dias ainda sem taxa publicada (o BCB publica com 1 dia de atraso):
    // usa a última taxa conhecida em dias de semana
    if (taxaCdi === undefined && d > ultimaPublicada.data && diaUtilSimples(d)) {
      taxaCdi = ultimaPublicada.taxa;
    }
    if (taxaCdi !== undefined) {
      const f = 1 + fatorDia(taxaCdi);
      for (const l of lotes) if (l.valor > 0) l.valor *= f;
    }
  }
  aplicar(hoje);

  let bruto = 0;
  let impostos = 0;
  for (const l of lotes) {
    bruto += l.valor;
    const ganho = Math.max(0, l.valor - l.principal);
    const dias = diasEntre(l.data, hoje);
    const iof = ganho * aliquotaIOF(dias);
    impostos += l.irBase + iof + (ganho - iof) * aliquotaIR(dias);
  }

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const estimado = r2(bruto);
  const registrado = saldoRegistrado(ordenados, hoje);
  return {
    estimado,
    rendimento: r2(estimado - registrado),
    liquido: r2(bruto - impostos),
    impostos: r2(impostos),
    baseInformada: ancora.valor_liquido != null,
    desde: ancora.data,
    taxaAte: ultimaPublicada.data,
  };
}

export function descreverTaxa(indexador: Indexador, taxa: number | null) {
  if (indexador === "nenhum" || taxa === null) return "Sem rendimento";
  const t = Number(taxa).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return indexador === "cdi" ? `${t}% do CDI` : `${t}% ao ano`;
}
