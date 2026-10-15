import { createClient } from "@/lib/supabase/server";
import {
  competenciaParaData,
  formatBRL,
  listaMeses,
  mesAtual,
  somarMeses,
} from "@/lib/format";
import { Resumo } from "../_components/mes-nav";
import { FiltroPeriodo } from "./filtro-periodo";
import {
  BarrasHorizontais,
  Colunas,
  EvolucaoConta,
  Linhas,
} from "./graficos";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type Lanc = {
  competencia: string;
  valor_previsto: number;
  valor_pago: number | null;
  contas: { nome: string; categoria: string };
};
type Rec = { competencia: string; pessoa: string; tipo: "salario" | "extra"; valor: number };
type Juro = { competencia: string; valor: number };

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const atual = mesAtual();
  const pedidoDe = typeof sp.de === "string" && MES_RE.test(sp.de) ? sp.de : null;
  const pedidoAte = typeof sp.ate === "string" && MES_RE.test(sp.ate) ? sp.ate : null;

  let ate = pedidoAte ?? atual;
  let de = pedidoDe ?? somarMeses(ate, -11);
  if (de > ate) [de, ate] = [ate, de];

  const supabase = await createClient();
  const deData = competenciaParaData(de);
  const ateData = competenciaParaData(ate);

  const [lancRes, recRes, jurosRes] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("competencia, valor_previsto, valor_pago, contas!inner(nome, categoria)")
      .gte("competencia", deData)
      .lte("competencia", ateData)
      .returns<Lanc[]>(),
    supabase
      .from("receitas")
      .select("competencia, pessoa, tipo, valor")
      .gte("competencia", deData)
      .lte("competencia", ateData)
      .returns<Rec[]>(),
    supabase
      .from("juros_obra")
      .select("competencia, valor")
      .gte("competencia", deData)
      .lte("competencia", ateData)
      .returns<Juro[]>(),
  ]);
  const erro = lancRes.error ?? recRes.error ?? jurosRes.error;
  const lancs = lancRes.data ?? [];
  const recs = recRes.data ?? [];
  const juros = jurosRes.data ?? [];

  // Sem período escolhido: começa no primeiro mês com algum dado
  if (!pedidoDe) {
    const primeiro = [...lancs, ...recs, ...juros]
      .map((x) => x.competencia.slice(0, 7))
      .sort()[0];
    if (primeiro && primeiro > de) de = primeiro;
  }

  const meses = listaMeses(de, ate);
  const idx = new Map(meses.map((m, i) => [m, i]));
  const zeros = () => meses.map(() => 0);
  const mesDe = (c: string) => idx.get(c.slice(0, 7));

  // Conta paga vale o valor pago; pendente vale o previsto
  const valorLanc = (l: Lanc) => Number(l.valor_pago ?? l.valor_previsto);

  const despesas = zeros();
  const porCategoria = new Map<string, number>();
  const porConta = new Map<string, (number | null)[]>();
  for (const l of lancs) {
    const i = mesDe(l.competencia);
    if (i === undefined) continue;
    const v = valorLanc(l);
    despesas[i] += v;
    porCategoria.set(l.contas.categoria, (porCategoria.get(l.contas.categoria) ?? 0) + v);
    const serie = porConta.get(l.contas.nome) ?? meses.map(() => null);
    serie[i] = (serie[i] ?? 0) + v;
    porConta.set(l.contas.nome, serie);
  }

  const receitas = zeros();
  const salarios = new Map<string, (number | null)[]>();
  const extras = zeros();
  for (const r of recs) {
    const i = mesDe(r.competencia);
    if (i === undefined) continue;
    receitas[i] += Number(r.valor);
    if (r.tipo === "salario") {
      const serie = salarios.get(r.pessoa) ?? meses.map(() => null);
      serie[i] = (serie[i] ?? 0) + Number(r.valor);
      salarios.set(r.pessoa, serie);
    } else {
      extras[i] += Number(r.valor);
    }
  }

  const jurosSerie: (number | null)[] = meses.map(() => null);
  for (const j of juros) {
    const i = mesDe(j.competencia);
    if (i !== undefined) jurosSerie[i] = Number(j.valor);
  }

  const totalReceitas = receitas.reduce((a, b) => a + b, 0);
  const totalDespesas = despesas.reduce((a, b) => a + b, 0);
  const saldo = totalReceitas - totalDespesas;
  const mesesComGasto = despesas.filter((v) => v > 0).length;
  const mediaGastos = mesesComGasto ? totalDespesas / mesesComGasto : 0;

  const categorias = [...porCategoria]
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor);

  const contas = [...porConta]
    .map(([nome, valores]) => ({ nome, valores }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Salários: até 2 pessoas com cor própria (ordem alfabética, fixa)
  const pessoas = [...salarios.keys()].sort();
  const coresPessoa = ["var(--series-1)", "var(--series-2)"];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <FiltroPeriodo de={de} ate={ate} atual={atual} />

      {erro && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {erro.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo titulo="Receitas no período" valor={formatBRL(totalReceitas)} />
        <Resumo titulo="Despesas no período" valor={formatBRL(totalDespesas)} />
        <Resumo
          titulo={saldo >= 0 ? "Sobrou no período" : "Faltou no período"}
          valor={formatBRL(saldo)}
          cor={saldo >= 0 ? "positivo" : "negativo"}
        />
        <Resumo titulo="Média de gastos / mês" valor={formatBRL(mediaGastos)} />
      </div>

      <Cartao titulo="Receitas × despesas por mês">
        <Colunas
          meses={meses}
          series={[
            { nome: "Receitas", cor: "var(--series-1)", valores: receitas },
            { nome: "Despesas", cor: "var(--series-2)", valores: despesas },
          ]}
          extra={{ nome: "Saldo", valores: receitas.map((r, i) => r - despesas[i]) }}
        />
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Gastos por categoria no período">
          <BarrasHorizontais itens={categorias} total={totalDespesas} />
        </Cartao>

        <Cartao titulo="Evolução de uma conta">
          <EvolucaoConta meses={meses} contas={contas} />
        </Cartao>

        <Cartao titulo="Salários por mês">
          {pessoas.length === 0 ? (
            <Vazio />
          ) : (
            <Linhas
              meses={meses}
              series={pessoas.slice(0, 2).map((p, k) => ({
                nome: p,
                cor: coresPessoa[k],
                valores: salarios.get(p)!,
              }))}
            />
          )}
          {extras.some((v) => v > 0) && (
            <p className="mt-3 text-sm text-muted">
              Extras no período: {formatBRL(extras.reduce((a, b) => a + b, 0))}
            </p>
          )}
        </Cartao>

        <Cartao titulo="Juros de obra">
          {jurosSerie.every((v) => v === null) ? (
            <Vazio />
          ) : (
            <Linhas
              meses={meses}
              series={[{ nome: "Juros de obra", cor: "var(--series-1)", valores: jurosSerie }]}
            />
          )}
        </Cartao>
      </div>
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-medium">{titulo}</h2>
      {children}
    </section>
  );
}

function Vazio() {
  return <p className="py-8 text-center text-sm text-muted">Sem dados no período.</p>;
}
