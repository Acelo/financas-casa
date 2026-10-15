import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, formatBRL, lerMes } from "@/lib/format";
import { MesNav, Resumo } from "../_components/mes-nav";
import { NovaReceita, ReceitaItem, type ReceitaView } from "./receita-form";

export default function Receitas({ searchParams }: PageProps<"/receitas">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando...</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({
  searchParams,
}: {
  searchParams: PageProps<"/receitas">["searchParams"];
}) {
  const mes = lerMes((await searchParams).mes);
  const competencia = competenciaParaData(mes);
  const supabase = await createClient();

  const [receitasRes, membrosRes, contasRes] = await Promise.all([
    supabase
      .from("receitas")
      .select("id, pessoa, tipo, descricao, valor")
      .eq("competencia", competencia)
      .order("tipo", { ascending: false })
      .order("pessoa")
      .returns<ReceitaView[]>(),
    supabase.from("membros").select("nome").order("nome"),
    supabase
      .from("lancamentos")
      .select("valor_previsto, valor_pago")
      .eq("competencia", competencia),
  ]);

  const erro = receitasRes.error ?? membrosRes.error ?? contasRes.error;
  const receitas = receitasRes.data ?? [];
  const pessoas = [...(membrosRes.data ?? []).map((m) => m.nome as string), "Outro"];

  const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor), 0);
  // Conta paga vale o valor pago; pendente vale o previsto
  const totalContas = (contasRes.data ?? []).reduce(
    (s, l) => s + Number(l.valor_pago ?? l.valor_previsto),
    0,
  );
  const saldo = totalReceitas - totalContas;

  const porPessoa = new Map<string, { salario: number; extra: number }>();
  for (const r of receitas) {
    const p = porPessoa.get(r.pessoa) ?? { salario: 0, extra: 0 };
    p[r.tipo] += Number(r.valor);
    porPessoa.set(r.pessoa, p);
  }

  return (
    <div className="space-y-6">
      <MesNav mes={mes} base="/receitas" />

      {erro && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {erro.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resumo titulo="Receitas" valor={formatBRL(totalReceitas)} cor="positivo" />
        <Resumo titulo="Contas do mês" valor={formatBRL(totalContas)} />
        <Resumo
          titulo={saldo >= 0 ? "Sobra" : "Falta"}
          valor={formatBRL(saldo)}
          cor={saldo >= 0 ? "positivo" : "negativo"}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {porPessoa.size > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...porPessoa].map(([pessoa, v]) => (
            <div key={pessoa} className="rounded-xl border border-border bg-surface p-3 text-sm">
              <p className="font-medium">{pessoa}</p>
              <p className="text-muted">
                Salário {formatBRL(v.salario)} · Extras {formatBRL(v.extra)}
              </p>
            </div>
          ))}
        </div>
      )}

      <NovaReceita key={mes} mes={mes} pessoas={pessoas} />

      {receitas.length === 0 && !erro ? (
        <p className="text-sm text-muted">Nenhuma receita lançada neste mês.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {receitas.map((r) => (
            <ReceitaItem key={r.id} r={r} mes={mes} pessoas={pessoas} />
          ))}
        </ul>
      )}
    </div>
  );
}
