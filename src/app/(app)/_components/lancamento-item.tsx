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
  // false = previsto ainda é a estimativa do mês anterior (lembrete)
  valor_conferido: boolean;
  contas: {
    nome: string;
    categoria: string;
    dia_vencimento: number | null;
    parcelas_totais: number | null;
    recorrente: boolean;
    tipo_valor: "fixo" | "variavel";
    origem_valor: "manual" | "juros_obra";
  };
};

// Lembrete discreto: o valor ainda não foi conferido neste mês
function IconeNaoEditado() {
  return (
    <span title="Valor ainda não editado" className="inline-flex shrink-0 text-accent">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
      <span className="sr-only">Valor ainda não editado</span>
    </span>
  );
}

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
  // Dia que vale neste mês: o alterado só aqui ou o do cadastro
  const vencEfetivo = vencimentoEfetivo(l.competencia, l.vencimento, l.contas.dia_vencimento);
  const diaEfetivo = vencEfetivo ? Number(vencEfetivo.slice(8)) : null;
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
          <p className="flex items-center gap-1.5 font-medium">
            <span className="truncate">{l.contas.nome}</span>
            {!l.valor_conferido && <IconeNaoEditado />}
          </p>
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
          {!l.valor_conferido && (
            <div className="space-y-1 sm:col-span-2">
              <p className="flex items-center gap-1.5 text-xs text-accent">
                <IconeNaoEditado />
                Valor ainda é o do mês anterior. Ajuste quando a conta chegar e salve.
              </p>
              {/* Para quando a conta veio com o mesmo valor do mês passado */}
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="confirmar_valor" />
                O valor está certo, só confirmar
              </label>
            </div>
          )}

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
            <span className="text-xs text-muted">Dia do vencimento</span>
            <input
              name="dia_vencimento"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="sem dia"
              defaultValue={diaEfetivo ?? ""}
              className={campo}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="vencimento_proximos" />
            Mudar também nos próximos meses
          </label>
          {/* Variável = todo mês nasce com o lembrete "valor ainda não editado".
              O Apartamento fica de fora: o valor vem sozinho dos juros de obra */}
          {l.contas.origem_valor === "manual" && (
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="variavel" defaultChecked={l.contas.tipo_valor === "variavel"} className="mt-1" />
              <span>
                Valor variável
                <span className="block text-xs text-muted">Nos próximos meses, lembrar de atualizar o valor</span>
              </span>
            </label>
          )}
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
