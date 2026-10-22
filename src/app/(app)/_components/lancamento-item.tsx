"use client";

import { useActionState, useState, useTransition } from "react";
import { formatBRL } from "@/lib/format";
import { valorParaInput } from "@/lib/valores";
import { rotuloVencimento, vencimentoEfetivo } from "@/lib/vencimento";
import { CampoValor } from "./campo-valor";
import {
  excluirLancamento,
  marcarPago,
  salvarLancamento,
  type Resultado,
} from "../actions";

export type LancamentoView = {
  id: string;
  valor_previsto: number;
  valor_pago: number | null;
  data_pagamento: string | null;
  status: "pendente" | "pago";
  competencia: string;
  vencimento: string | null; // só quando mudou neste mês
  parcela: number | null;
  obs: string | null;
  contas: {
    nome: string;
    categoria: string;
    dia_vencimento: number | null;
    parcelas_totais: number | null;
    recorrente: boolean;
  };
};

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

type Selecao = { ativo: boolean; marcado: boolean; alternar: () => void };

export function LancamentoItem({
  l,
  selecao,
}: {
  l: LancamentoView;
  selecao: Selecao;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, startTransition] = useTransition();
  const [state, action, salvando] = useActionState<Resultado, FormData>(
    async (prev, fd) => {
      const r = await salvarLancamento(prev, fd);
      if (r.ok) setAberto(false);
      return r;
    },
    {},
  );

  const pago = l.status === "pago";
  const diferenca =
    pago && l.valor_pago !== null
      ? Number(l.valor_pago) - Number(l.valor_previsto)
      : 0;

  return (
    <li className={`${pendente ? "opacity-60" : ""} ${selecao.marcado ? "bg-accent/10" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {selecao.ativo && (
          <input
            type="checkbox"
            checked={selecao.marcado}
            onChange={selecao.alternar}
            aria-label={`Selecionar ${l.contas.nome}`}
            className="size-5 shrink-0 accent-[var(--accent)]"
          />
        )}
        <button
          type="button"
          onClick={() => (selecao.ativo ? selecao.alternar() : setAberto((a) => !a))}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-medium">{l.contas.nome}</p>
          {/* A categoria já está no título do grupo */}
          <p className="text-xs text-muted">
            {[
              rotuloVencimento(l.competencia, l.vencimento, l.contas.dia_vencimento),
              l.vencimento && "só este mês",
              l.parcela && l.contas.parcelas_totais && `${l.parcela}/${l.contas.parcelas_totais}`,
              !l.contas.recorrente && "avulso",
            ]
              .filter(Boolean)
              .join(" · ") || " "}
          </p>
        </button>

        <div className="text-right">
          <p className="whitespace-nowrap font-medium tabular-nums">
            {formatBRL(l.valor_pago ?? l.valor_previsto)}
          </p>
          {Math.abs(diferenca) >= 0.01 && (
            <p className="text-xs text-muted">
              prev. {formatBRL(l.valor_previsto)}
            </p>
          )}
        </div>

        {pago || selecao.ativo ? (
          <span className={`w-20 text-center text-xs font-medium ${pago ? "text-positive" : "text-negative"}`}>
            {pago ? "Pago" : "Pendente"}
          </span>
        ) : (
          <button
            type="button"
            disabled={pendente}
            onClick={() => startTransition(async () => { await marcarPago(l.id); })}
            className="w-20 rounded-md border border-border px-2 py-1 text-xs font-medium text-negative hover:border-accent hover:text-accent"
          >
            Pagar
          </button>
        )}
      </div>

      {aberto && !selecao.ativo && (
        <form action={action} className="grid gap-3 border-t border-border bg-background/60 px-4 py-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={l.id} />

          <label className="space-y-1">
            <span className="text-xs text-muted">Valor previsto</span>
            <CampoValor name="valor_previsto" defaultValue={valorParaInput(l.valor_previsto)} className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Valor pago</span>
            <CampoValor name="valor_pago" defaultValue={valorParaInput(l.valor_pago)} placeholder="igual ao previsto" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Status</span>
            <select name="status" defaultValue={l.status} className={campo}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Data do pagamento</span>
            <input name="data_pagamento" type="date" defaultValue={l.data_pagamento ?? ""} className={campo} />
          </label>
          {/* Vencimento: muda só este mês, ou também o cadastro (próximos meses) */}
          <label className="space-y-1">
            <span className="text-xs text-muted">Vencimento</span>
            <input
              name="vencimento"
              type="date"
              defaultValue={vencimentoEfetivo(l.competencia, l.vencimento, l.contas.dia_vencimento) ?? ""}
              className={campo}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="vencimento_proximos" />
            Mudar também nos próximos meses
          </label>
          {/* Corrige a contagem: os meses seguintes continuam a partir daqui */}
          {l.contas.parcelas_totais && (
            <label className="space-y-1">
              <span className="text-xs text-muted">Parcela nº (de {l.contas.parcelas_totais})</span>
              <input
                name="parcela"
                type="number"
                inputMode="numeric"
                min={1}
                max={l.contas.parcelas_totais}
                defaultValue={l.parcela ?? ""}
                className={campo}
              />
            </label>
          )}
          <label className={`space-y-1 ${l.contas.parcelas_totais ? "" : "sm:col-span-2"}`}>
            <span className="text-xs text-muted">Observação</span>
            <input name="obs" defaultValue={l.obs ?? ""} className={campo} />
          </label>

          {state.erro && <p className="text-sm text-negative sm:col-span-2">{state.erro}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (confirm(`Remover "${l.contas.nome}" deste mês?`)) {
                  startTransition(async () => { await excluirLancamento(l.id); });
                }
              }}
              className="ml-auto rounded-lg px-3 py-2 text-sm text-negative hover:underline"
            >
              Remover do mês
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
