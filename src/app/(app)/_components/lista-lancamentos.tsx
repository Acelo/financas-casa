"use client";

import { useState, useTransition } from "react";
import { excluirLancamentos, type Resultado } from "../actions";
import { formatBRL } from "@/lib/format";
import { IconeCategoria } from "./icones";
import { LancamentoItem, type LancamentoView } from "./lancamento-item";

export function ListaLancamentos({ lancamentos }: { lancamentos: LancamentoView[] }) {
  const [selecionando, setSelecionando] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<Resultado>({});
  const [excluindo, startTransition] = useTransition();

  // Ignora ids que sumiram da lista (ex.: após excluir ou trocar de mês)
  const ids = new Set(lancamentos.map((l) => l.id));
  const selecionados = [...marcados].filter((id) => ids.has(id));
  const todos = selecionados.length === lancamentos.length && lancamentos.length > 0;
  const grupos = agrupar(lancamentos);

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function sair() {
    setSelecionando(false);
    setMarcados(new Set());
  }

  function excluir() {
    const n = selecionados.length;
    if (!confirm(`Remover ${n} conta(s) deste mês? Isso não apaga o cadastro.`)) return;
    startTransition(async () => {
      const r = await excluirLancamentos(selecionados);
      setMsg(r);
      if (!r.erro) sair();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        {selecionando ? (
          <>
            <button
              type="button"
              onClick={() => setMarcados(todos ? new Set() : new Set(ids))}
              className="rounded-lg vidro px-3 py-1.5 text-sm"
            >
              {todos ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <span className="text-sm text-muted">{selecionados.length} selecionada(s)</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={!selecionados.length || excluindo}
                onClick={excluir}
                className="rounded-lg bg-negative px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {excluindo ? "Excluindo..." : `Excluir (${selecionados.length})`}
              </button>
              <button type="button" onClick={sair} className="rounded-lg border border-border px-3 py-1.5 text-sm">
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMsg({});
              setSelecionando(true);
            }}
            className="ml-auto rounded-lg vidro px-3 py-1.5 text-sm"
          >
            Selecionar
          </button>
        )}
      </div>

      {(msg.ok || msg.erro) && (
        <p className={`text-sm ${msg.erro ? "text-negative" : "text-muted"}`}>{msg.erro ?? msg.ok}</p>
      )}

      {grupos.map(([categoria, itens]) => {
        const subtotal = itens.reduce((s, l) => s + Number(l.valor_pago ?? l.valor_previsto), 0);
        const pendentes = itens.filter((l) => l.status === "pendente").length;
        const idsGrupo = itens.map((l) => l.id);
        const grupoTodo = idsGrupo.every((id) => marcados.has(id));
        return (
          <section key={categoria} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              {selecionando && (
                <input
                  type="checkbox"
                  checked={grupoTodo}
                  onChange={() =>
                    setMarcados((atual) => {
                      const novo = new Set(atual);
                      idsGrupo.forEach((id) => (grupoTodo ? novo.delete(id) : novo.add(id)));
                      return novo;
                    })
                  }
                  aria-label={`Selecionar ${categoria}`}
                  className="size-4 accent-[var(--accent)]"
                />
              )}
              <IconeCategoria categoria={categoria} className="size-4 text-muted" />
              <h2 className="font-medium">{categoria}</h2>
              <span className="text-xs text-muted">
                {itens.length}
                {pendentes > 0 && ` · ${pendentes} pendente${pendentes > 1 ? "s" : ""}`}
              </span>
              <span className="ml-auto text-sm tabular-nums text-muted">{formatBRL(subtotal)}</span>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-xl vidro">
              {itens.map((l) => (
                <LancamentoItem
                  key={l.id}
                  l={l}
                  selecao={{
                    ativo: selecionando,
                    marcado: selecionando && marcados.has(l.id),
                    alternar: () => alternar(l.id),
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// Faturas de cartão por último, como em Recorrentes; o resto em ordem alfabética
function agrupar(lancamentos: LancamentoView[]) {
  const mapa = new Map<string, LancamentoView[]>();
  for (const l of lancamentos) {
    mapa.set(l.contas.categoria, [...(mapa.get(l.contas.categoria) ?? []), l]);
  }
  return [...mapa].sort(([a], [b]) =>
    a === "Cartão" ? 1 : b === "Cartão" ? -1 : a.localeCompare(b),
  );
}
