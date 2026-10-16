"use client";

import { useActionState, useState, useTransition } from "react";
import { formatBRL } from "@/lib/format";
import { valorParaInput } from "@/lib/valores";
import type { Resultado } from "../actions";
import { copiarSalarios, excluirReceita, salvarReceita } from "./actions";

export type ReceitaView = {
  id: string;
  pessoa: string;
  tipo: "salario" | "extra";
  descricao: string | null;
  valor: number;
};

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

function Formulario({
  mes,
  pessoas,
  receita,
  aoTerminar,
}: {
  mes: string;
  pessoas: string[];
  receita?: ReceitaView;
  aoTerminar: () => void;
}) {
  const [excluindo, startTransition] = useTransition();
  const [state, action, salvando] = useActionState<Resultado, FormData>(
    async (prev, fd) => {
      const r = await salvarReceita(prev, fd);
      if (r.ok) aoTerminar();
      return r;
    },
    {},
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="mes" value={mes} />
      {receita && <input type="hidden" name="id" value={receita.id} />}

      <label className="space-y-1">
        <span className="text-xs text-muted">Pessoa</span>
        <select name="pessoa" defaultValue={receita?.pessoa ?? pessoas[0]} className={campo}>
          {pessoas.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Tipo</span>
        <select name="tipo" defaultValue={receita?.tipo ?? "salario"} className={campo}>
          <option value="salario">Salário</option>
          <option value="extra">Extra</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Valor</span>
        <input name="valor" required inputMode="decimal" placeholder="0,00" defaultValue={receita ? valorParaInput(receita.valor) : ""} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Descrição</span>
        <input name="descricao" placeholder="Ex.: hora extra, presente da mãe" defaultValue={receita?.descricao ?? ""} className={campo} />
      </label>

      {state.erro && <p className="text-sm text-negative sm:col-span-4">{state.erro}</p>}

      <div className="flex gap-2 sm:col-span-4">
        <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={aoTerminar} className="rounded-lg border border-border px-4 py-2 text-sm">
          Cancelar
        </button>
        {receita && (
          <button
            type="button"
            disabled={excluindo}
            onClick={() => {
              if (confirm("Excluir esta receita?")) {
                startTransition(async () => {
                  await excluirReceita(receita.id);
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

export function NovaReceita({ mes, pessoas }: { mes: string; pessoas: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<Resultado>({});
  const [copiando, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          + Nova receita
        </button>
        <button
          type="button"
          disabled={copiando}
          onClick={() => startTransition(async () => setMsg(await copiarSalarios(mes)))}
          className="rounded-lg vidro px-4 py-2 text-sm disabled:opacity-60"
        >
          {copiando ? "Copiando..." : "Copiar salários do mês anterior"}
        </button>
      </div>

      {(msg.ok || msg.erro) && (
        <p className={`text-sm ${msg.erro ? "text-negative" : "text-muted"}`}>{msg.erro ?? msg.ok}</p>
      )}

      {aberto && (
        <div className="rounded-xl vidro p-4">
          <Formulario mes={mes} pessoas={pessoas} aoTerminar={() => setAberto(false)} />
        </div>
      )}
    </div>
  );
}

export function ReceitaItem({
  r,
  mes,
  pessoas,
}: {
  r: ReceitaView;
  mes: string;
  pessoas: string[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {r.pessoa} · {r.tipo === "salario" ? "Salário" : "Extra"}
          </p>
          {r.descricao && <p className="truncate text-xs text-muted">{r.descricao}</p>}
        </div>
        <p className="whitespace-nowrap font-medium tabular-nums text-positive">
          {formatBRL(r.valor)}
        </p>
      </button>
      {aberto && (
        <div className="border-t border-border bg-background/60 px-4 py-4">
          <Formulario mes={mes} pessoas={pessoas} receita={r} aoTerminar={() => setAberto(false)} />
        </div>
      )}
    </li>
  );
}
