import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  competenciaParaData,
  formatBRL,
  mesAtual,
  nomeDoMes,
  somarMeses,
} from "@/lib/format";
import { AcoesMes } from "./_components/acoes-mes";
import {
  LancamentoItem,
  type LancamentoView,
} from "./_components/lancamento-item";

export default function ContasDoMes({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Carregando...</p>}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}

async function Conteudo({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const { mes: mesParam } = await searchParams;
  const mes =
    typeof mesParam === "string" && /^\d{4}-\d{2}$/.test(mesParam)
      ? mesParam
      : mesAtual();

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
      <div className="flex items-center justify-between gap-2">
        <Link href={`/?mes=${somarMeses(mes, -1)}`} className="rounded-md px-3 py-1 text-xl text-muted hover:bg-surface">
          ‹
        </Link>
        <h1 className="text-lg font-semibold">{nomeDoMes(mes)}</h1>
        <Link href={`/?mes=${somarMeses(mes, 1)}`} className="rounded-md px-3 py-1 text-xl text-muted hover:bg-surface">
          ›
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}

      {/* No celular: Previsto e Pago lado a lado, Falta pagar embaixo inteiro */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resumo titulo="Previsto" valor={totalPrevisto} />
        <Resumo titulo="Pago" valor={totalPago} />
        <Resumo
          titulo="Falta pagar"
          valor={faltaPagar}
          destaque={faltaPagar > 0}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <AcoesMes key={mes} mes={mes} />

      {lancamentos.length === 0 && !error ? (
        <p className="text-sm text-muted">
          Nenhuma conta lançada neste mês. Use &quot;Gerar contas do mês&quot; para
          trazer as contas recorrentes.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {lancamentos.map((l) => (
            <LancamentoItem key={l.id} l={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Resumo({
  titulo,
  valor,
  destaque,
  className = "",
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-surface p-3 ${className}`}>
      <p className="text-xs text-muted">{titulo}</p>
      <p className={`whitespace-nowrap text-lg font-semibold tabular-nums ${destaque ? "text-negative" : ""}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}
