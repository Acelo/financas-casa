"use client";

import { useActionState, useState, useTransition } from "react";
import { formatBRL, nomeDoMes } from "@/lib/format";
import { valorParaInput } from "@/lib/valores";
import type { Resultado } from "../actions";
import { excluirJuros, salvarJuros } from "./actions";

export type JurosView = {
  competencia: string;
  valor: number;
  data_pagamento: string | null;
  obs: string | null;
  variacao: number | null;
  variacao_pct: number | null;
};

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

export function JurosLista({
  registros,
  proximoMes,
}: {
  registros: JurosView[];
  proximoMes: string;
}) {
  const [novo, setNovo] = useState(false);
  const maior = Math.max(...registros.map((r) => Number(r.valor)), 1);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setNovo((n) => !n)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        + Lançar mês
      </button>

      {novo && (
        <div className="rounded-xl vidro p-4">
          <FormJuros mesPadrao={proximoMes} aoTerminar={() => setNovo(false)} />
        </div>
      )}

      {registros.length === 0 ? (
        <p className="text-sm text-muted">Nenhum mês lançado.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl vidro">
          {registros.map((r) => (
            <JurosItem key={r.competencia} r={r} maior={maior} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JurosItem({ r, maior }: { r: JurosView; maior: number }) {
  const [aberto, setAberto] = useState(false);
  const pct = r.variacao_pct === null ? null : Number(r.variacao_pct);

  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="block w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-medium">{nomeDoMes(r.competencia.slice(0, 7))}</p>
          {pct !== null && (
            <span className={`whitespace-nowrap text-xs tabular-nums ${pct > 0 ? "text-negative" : "text-positive"}`}>
              {pct > 0 ? "▲" : "▼"} {formatBRL(Math.abs(Number(r.variacao)))} ({Math.abs(pct).toFixed(1).replace(".", ",")}%)
            </span>
          )}
          <p className="whitespace-nowrap font-medium tabular-nums">{formatBRL(r.valor)}</p>
        </div>
        {/* Barra proporcional ao maior mês */}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(Number(r.valor) / maior) * 100}%` }} />
        </div>
        {r.obs && <p className="mt-1 text-xs text-muted">{r.obs}</p>}
      </button>

      {aberto && (
        <div className="border-t border-border bg-background/60 px-4 py-4">
          <FormJuros registro={r} aoTerminar={() => setAberto(false)} />
        </div>
      )}
    </li>
  );
}

function FormJuros({
  registro,
  mesPadrao,
  aoTerminar,
}: {
  registro?: JurosView;
  mesPadrao?: string;
  aoTerminar: () => void;
}) {
  const [excluindo, startTransition] = useTransition();
  const [state, action, salvando] = useActionState<Resultado, FormData>(
    async (prev, fd) => {
      const r = await salvarJuros(prev, fd);
      if (r.ok) aoTerminar();
      return r;
    },
    {},
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {registro && <input type="hidden" name="original" value={registro.competencia} />}
      <label className="space-y-1">
        <span className="text-xs text-muted">Mês</span>
        <input name="mes" type="month" required defaultValue={registro?.competencia.slice(0, 7) ?? mesPadrao} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Valor</span>
        <input name="valor" required inputMode="decimal" placeholder="0,00" defaultValue={registro ? valorParaInput(registro.valor) : ""} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Data do pagamento</span>
        <input name="data_pagamento" type="date" defaultValue={registro?.data_pagamento ?? ""} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Observação</span>
        <input name="obs" defaultValue={registro?.obs ?? ""} className={campo} />
      </label>

      {state.erro && <p className="text-sm text-negative sm:col-span-4">{state.erro}</p>}

      <div className="flex gap-2 sm:col-span-4">
        <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={aoTerminar} className="rounded-lg border border-border px-4 py-2 text-sm">
          Cancelar
        </button>
        {registro && (
          <button
            type="button"
            disabled={excluindo}
            onClick={() => {
              if (confirm("Excluir este mês dos juros de obra?")) {
                startTransition(async () => {
                  await excluirJuros(registro.competencia);
                  aoTerminar();
                });
              }
            }}
            className="ml-auto rounded-lg px-3 py-2 text-sm text-negative hover:underline"
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
