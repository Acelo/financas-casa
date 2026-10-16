import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, formatBRL, lerMes } from "@/lib/format";
import { AcoesMes } from "./_components/acoes-mes";
import { MesNav, Resumo } from "./_components/mes-nav";
import type { LancamentoView } from "./_components/lancamento-item";
import { ListaLancamentos } from "./_components/lista-lancamentos";

export async function ContasDoMes({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const mes = lerMes((await searchParams).mes);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select(
      "id, valor_previsto, valor_pago, data_pagamento, status, parcela, obs, contas!inner(nome, categoria, dia_vencimento, parcelas_totais, recorrente)",
    )
    .eq("competencia", competenciaParaData(mes))
    .returns<LancamentoView[]>();

  const lancamentos = (data ?? []).sort(
    (a, b) =>
      (a.contas.dia_vencimento ?? 99) - (b.contas.dia_vencimento ?? 99) ||
      a.contas.nome.localeCompare(b.contas.nome),
  );

  const totalPrevisto = lancamentos.reduce((s, l) => s + Number(l.valor_previsto), 0);
  const totalPago = lancamentos.reduce((s, l) => s + Number(l.valor_pago ?? 0), 0);
  const faltaPagar = lancamentos
    .filter((l) => l.status === "pendente")
    .reduce((s, l) => s + Number(l.valor_previsto), 0);

  return (
    <div className="space-y-6">
      <MesNav mes={mes} base="/" />

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}

      {/* No celular: Previsto e Pago lado a lado, Falta pagar embaixo inteiro */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resumo titulo="Previsto" valor={formatBRL(totalPrevisto)} />
        <Resumo titulo="Pago" valor={formatBRL(totalPago)} />
        <Resumo
          titulo="Falta pagar"
          valor={formatBRL(faltaPagar)}
          cor={faltaPagar > 0 ? "negativo" : undefined}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* key por mês: zera o estado (mensagens, formulário aberto) ao trocar de mês */}
      <AcoesMes key={`acoes-${mes}`} mes={mes} />

      {lancamentos.length === 0 && !error ? (
        <p className="text-sm text-muted">
          Nenhuma conta lançada neste mês. Use &quot;Gerar contas do mês&quot; para
          trazer as contas recorrentes.
        </p>
      ) : (
        <ListaLancamentos key={`lista-${mes}`} lancamentos={lancamentos} />
      )}
    </div>
  );
}
