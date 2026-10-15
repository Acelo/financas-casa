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

type Lancamento = {
  id: string;
  valor_previsto: number;
  valor_pago: number | null;
  status: "pendente" | "pago";
  parcela: number | null;
  contas: {
    nome: string;
    categoria: string;
    dia_vencimento: number | null;
    parcelas_totais: number | null;
  };
};

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
      "id, valor_previsto, valor_pago, status, parcela, contas!inner(nome, categoria, dia_vencimento, parcelas_totais)",
    )
    .eq("competencia", competenciaParaData(mes))
    .returns<Lancamento[]>();

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
        <Link href={`/?mes=${somarMeses(mes, -1)}`} className="rounded-md px-2 py-1 text-muted hover:bg-surface">
          ‹
        </Link>
        <h1 className="text-lg font-semibold">{nomeDoMes(mes)}</h1>
        <Link href={`/?mes=${somarMeses(mes, 1)}`} className="rounded-md px-2 py-1 text-muted hover:bg-surface">
          ›
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Resumo titulo="Previsto" valor={totalPrevisto} />
        <Resumo titulo="Pago" valor={totalPago} />
        <Resumo titulo="Falta pagar" valor={faltaPagar} destaque={faltaPagar > 0} />
      </div>

      {lancamentos.length === 0 && !error ? (
        <p className="text-sm text-muted">Nenhuma conta lançada neste mês.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {lancamentos.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.contas.nome}</p>
                <p className="text-xs text-muted">
                  {l.contas.categoria}
                  {l.contas.dia_vencimento && ` · dia ${l.contas.dia_vencimento}`}
                  {l.parcela && l.contas.parcelas_totais && ` · ${l.parcela}/${l.contas.parcelas_totais}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono tabular-nums">
                  {formatBRL(l.valor_pago ?? l.valor_previsto)}
                </p>
                <p className={`text-xs ${l.status === "pago" ? "text-positive" : "text-negative"}`}>
                  {l.status === "pago" ? "Pago" : "Pendente"}
                </p>
              </div>
            </li>
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
}: {
  titulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{titulo}</p>
      <p className={`font-mono text-base tabular-nums sm:text-lg ${destaque ? "text-negative" : ""}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}
