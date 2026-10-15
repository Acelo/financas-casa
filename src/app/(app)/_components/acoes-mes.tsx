"use client";

import { useActionState, useState, useTransition } from "react";
import { adicionarAvulso, gerarMes, type Resultado } from "../actions";

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

export function AcoesMes({ mes }: { mes: string }) {
  const [msg, setMsg] = useState<Resultado>({});
  const [gerando, startTransition] = useTransition();
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [state, action, salvando] = useActionState<Resultado, FormData>(
    async (prev, fd) => {
      const r = await adicionarAvulso(prev, fd);
      if (r.ok) setAvulsoAberto(false);
      return r;
    },
    {},
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={gerando}
          onClick={() => startTransition(async () => setMsg(await gerarMes(mes)))}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {gerando ? "Gerando..." : "Gerar contas do mês"}
        </button>
        <button
          type="button"
          onClick={() => setAvulsoAberto((a) => !a)}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm"
        >
          + Gasto avulso
        </button>
      </div>

      {(msg.ok || msg.erro) && (
        <p className={`text-sm ${msg.erro ? "text-negative" : "text-muted"}`}>
          {msg.erro ?? msg.ok}
        </p>
      )}

      {avulsoAberto && (
        <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
          <input type="hidden" name="mes" value={mes} />
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted">Descrição</span>
            <input name="nome" required placeholder="Ex.: Dentista" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Categoria</span>
            <input name="categoria" placeholder="Outros" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Valor</span>
            <input name="valor" required inputMode="decimal" placeholder="0,00" className={campo} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-4">
            <input type="checkbox" name="pago" defaultChecked /> Já está pago
          </label>
          {state.erro && <p className="text-sm text-negative sm:col-span-4">{state.erro}</p>}
          <div className="sm:col-span-4">
            <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {salvando ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
