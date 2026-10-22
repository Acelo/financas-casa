"use client";

import { useActionState, useState, useTransition } from "react";
import { formatBRL, nomeDoMes } from "@/lib/format";
import { valorParaInput } from "@/lib/valores";
import { IconeCategoria } from "../_components/icones";
import { Resumo } from "../_components/mes-nav";
import type { Resultado } from "../actions";
import { alternarAtivo, reajustarValor, salvarConta } from "./actions";
import { CampoValor } from "../_components/campo-valor";

export type ContaView = {
  id: string;
  nome: string;
  categoria: string;
  tipo_valor: "fixo" | "variavel";
  origem_valor: "manual" | "juros_obra";
  dia_vencimento: number | null;
  forma_pagamento: string | null;
  gera_lancamento: boolean;
  ativo: boolean;
  parcelas_totais: number | null;
  obs: string | null;
  valor_atual: number;
  historico: { valor: number; desde: string }[];
  ultima_parcela: number | null;
  ultimo_pago: number | null;
};

// Faturas de cartão já contêm as assinaturas no crédito: somá-las no total
// de recorrentes contaria o mesmo gasto duas vezes.
const CATEGORIA_CARTAO = "Cartão";

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

type Filtro = "ativos" | "cancelados" | "todos";

export function RecorrentesLista({ contas, mes }: { contas: ContaView[]; mes: string }) {
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [nova, setNova] = useState(false);

  const ativos = contas.filter((c) => c.ativo);
  const somaveis = ativos.filter((c) => c.categoria !== CATEGORIA_CARTAO);
  const total = somaveis.reduce((s, c) => s + c.valor_atual, 0);
  const assinaturas = somaveis
    .filter((c) => !c.gera_lancamento)
    .reduce((s, c) => s + c.valor_atual, 0);
  const cancelados = contas
    .filter((c) => !c.ativo && c.categoria !== CATEGORIA_CARTAO && !terminouParcelas(c))
    .reduce((s, c) => s + c.valor_atual, 0);

  const visiveis = contas.filter((c) =>
    filtro === "todos" ? true : filtro === "ativos" ? c.ativo : !c.ativo,
  );
  const grupos = new Map<string, ContaView[]>();
  for (const c of visiveis) {
    grupos.set(c.categoria, [...(grupos.get(c.categoria) ?? []), c]);
  }
  const categorias = [...grupos.keys()].sort((a, b) =>
    a === CATEGORIA_CARTAO ? 1 : b === CATEGORIA_CARTAO ? -1 : a.localeCompare(b),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Resumo titulo="Total recorrente / mês" valor={formatBRL(total)} />
        <Resumo titulo="Assinaturas no crédito" valor={formatBRL(assinaturas)} />
        <Resumo
          titulo="Economia com cancelados"
          valor={formatBRL(cancelados)}
          cor="positivo"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg vidro p-0.5 text-sm">
          {(["ativos", "cancelados", "todos"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`rounded-md px-3 py-1.5 capitalize ${filtro === f ? "bg-background font-medium" : "text-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNova((n) => !n)}
          className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent"
        >
          + Nova conta
        </button>
      </div>

      {nova && (
        <div className="rounded-xl vidro p-4">
          <FormConta aoTerminar={() => setNova(false)} />
        </div>
      )}

      {categorias.map((cat) => {
        const itens = grupos.get(cat)!;
        const subtotal = itens.filter((c) => c.ativo).reduce((s, c) => s + c.valor_atual, 0);
        return (
          <section key={cat} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="flex items-center gap-2 font-medium">
                <IconeCategoria categoria={cat} className="size-4 text-muted" />
                {cat}
              </h2>
              <span className="text-sm tabular-nums text-muted">{formatBRL(subtotal)}</span>
            </div>
            {cat === CATEGORIA_CARTAO && (
              <p className="px-1 text-xs text-muted">
                Valores da última fatura. Não entram no total: as assinaturas no crédito já estão dentro delas.
              </p>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-xl vidro">
              {itens.map((c) => (
                <ContaItem key={c.id} c={c} mes={mes} />
              ))}
            </ul>
          </section>
        );
      })}

      {visiveis.length === 0 && <p className="text-sm text-muted">Nenhuma conta aqui.</p>}
    </div>
  );
}

function terminouParcelas(c: ContaView) {
  return c.parcelas_totais !== null && (c.ultima_parcela ?? 0) >= c.parcelas_totais;
}

function ContaItem({ c, mes }: { c: ContaView; mes: string }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, startTransition] = useTransition();

  const detalhes = [
    c.forma_pagamento,
    c.dia_vencimento && `dia ${c.dia_vencimento}`,
    c.parcelas_totais &&
      (c.ultima_parcela
        ? `${c.ultima_parcela}/${c.parcelas_totais} · faltam ${Math.max(c.parcelas_totais - c.ultima_parcela, 0)}`
        : `${c.parcelas_totais}x`),
    !c.gera_lancamento && "só controle",
    c.origem_valor === "juros_obra" && "valor dos juros de obra",
  ].filter(Boolean);

  return (
    <li className={pendente ? "opacity-60" : ""}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${c.ativo ? "" : "text-muted line-through"}`}>{c.nome}</p>
          <p className="truncate text-xs text-muted">{detalhes.join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap font-medium tabular-nums">{formatBRL(c.valor_atual)}</p>
          {c.tipo_valor === "variavel" && c.ultimo_pago !== null && (
            <p className="whitespace-nowrap text-xs text-muted">último {formatBRL(c.ultimo_pago)}</p>
          )}
        </div>
      </button>

      {aberto && (
        <div className="space-y-5 border-t border-border bg-background/60 px-4 py-4">
          <FormConta conta={c} aoTerminar={() => setAberto(false)} />

          <FormReajuste conta={c} mes={mes} />

          {c.historico.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="text-xs text-muted">Histórico de valor</p>
              {c.historico.map((h) => (
                <p key={h.desde} className="flex justify-between tabular-nums">
                  <span>desde {nomeDoMes(h.desde.slice(0, 7))}</span>
                  <span>{formatBRL(h.valor)}</span>
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={pendente}
            onClick={() => startTransition(async () => { await alternarAtivo(c.id, !c.ativo); })}
            className={`rounded-lg border border-border px-4 py-2 text-sm ${c.ativo ? "text-negative" : "text-positive"}`}
          >
            {c.ativo ? "Cancelar esta conta" : "Reativar esta conta"}
          </button>
        </div>
      )}
    </li>
  );
}

function FormConta({ conta, aoTerminar }: { conta?: ContaView; aoTerminar: () => void }) {
  const [state, action, salvando] = useActionState<Resultado, FormData>(
    async (prev, fd) => {
      const r = await salvarConta(prev, fd);
      if (r.ok) aoTerminar();
      return r;
    },
    {},
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {conta && <input type="hidden" name="id" value={conta.id} />}

      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs text-muted">Nome</span>
        <input name="nome" required defaultValue={conta?.nome} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Categoria</span>
        <input name="categoria" required list="categorias" defaultValue={conta?.categoria} className={campo} />
        <datalist id="categorias">
          {["Moradia", "Financiamento", "Streaming", "Serviços", "Seguro", "Cartão", "Impostos", "Saúde"].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      {!conta && (
        <label className="space-y-1">
          <span className="text-xs text-muted">Valor</span>
          <CampoValor name="valor" required placeholder="0,00" className={campo} />
        </label>
      )}
      <label className="space-y-1">
        <span className="text-xs text-muted">Forma de pagamento</span>
        <input name="forma_pagamento" placeholder="Crédito, Boleto..." defaultValue={conta?.forma_pagamento ?? ""} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Dia de vencimento</span>
        <input name="dia_vencimento" inputMode="numeric" defaultValue={conta?.dia_vencimento ?? ""} className={campo} />
      </label>
      {/* Variável: cada mês gerado vem com o lembrete "valor ainda não editado" */}
      <label className="flex items-start gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="variavel" defaultChecked={conta?.tipo_valor === "variavel"} className="mt-1" />
        <span>
          Valor variável
          <span className="block text-xs text-muted">Lembrar de atualizar todo mês</span>
        </span>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Total de parcelas</span>
        <input name="parcelas_totais" inputMode="numeric" placeholder="sem parcelas" defaultValue={conta?.parcelas_totais ?? ""} className={campo} />
      </label>
      <label className="space-y-1 sm:col-span-4">
        <span className="text-xs text-muted">Observação</span>
        <input name="obs" defaultValue={conta?.obs ?? ""} className={campo} />
      </label>

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="gera_lancamento" defaultChecked={conta?.gera_lancamento ?? true} className="mt-1" />
        <span>
          Aparece em Contas do mês
          <span className="block text-xs text-muted">Desmarque para assinaturas cobradas no cartão</span>
        </span>
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="ativo" defaultChecked={conta?.ativo ?? true} /> Ativa
      </label>

      {state.erro && <p className="text-sm text-negative sm:col-span-4">{state.erro}</p>}

      <div className="flex gap-2 sm:col-span-4">
        <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
          {salvando ? "Salvando..." : conta ? "Salvar cadastro" : "Criar conta"}
        </button>
        <button type="button" onClick={aoTerminar} className="rounded-lg border border-border px-4 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormReajuste({ conta, mes }: { conta: ContaView; mes: string }) {
  const [state, action, salvando] = useActionState<Resultado, FormData>(reajustarValor, {});

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
      <input type="hidden" name="conta_id" value={conta.id} />
      <p className="text-sm font-medium sm:col-span-4">Reajuste de valor</p>
      <label className="space-y-1">
        <span className="text-xs text-muted">Novo valor</span>
        <CampoValor name="valor" required defaultValue={valorParaInput(conta.valor_atual)} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">A partir de</span>
        <input name="mes" type="month" required defaultValue={mes} className={campo} />
      </label>
      <div className="flex items-end sm:col-span-2">
        <button type="submit" disabled={salvando} className="rounded-lg vidro px-4 py-2 text-sm disabled:opacity-60">
          {salvando ? "Salvando..." : "Registrar reajuste"}
        </button>
      </div>
      {(state.erro || state.ok) && (
        <p className={`text-sm sm:col-span-4 ${state.erro ? "text-negative" : "text-muted"}`}>{state.erro ?? state.ok}</p>
      )}
    </form>
  );
}
