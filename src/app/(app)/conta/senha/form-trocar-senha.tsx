"use client";

import { useActionState, useState } from "react";
import { definirNovaSenha, type SenhaState } from "../../../login/actions";

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-11 text-base outline-none focus:border-accent";

function CampoSenha({ rotulo, name }: { rotulo: string; name: string }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{rotulo}</span>
      <span className="relative block">
        <input name={name} type={ver ? "text" : "password"} autoComplete="new-password" minLength={8} required className={campo} />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Esconder senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-2 flex items-center px-1 text-xs text-muted hover:text-foreground"
        >
          {ver ? "ocultar" : "ver"}
        </button>
      </span>
    </label>
  );
}

export function FormTrocarSenha() {
  const [state, action, pending] = useActionState<SenhaState, FormData>(definirNovaSenha, {});
  // Depois de salvar, limpa os campos (key nova remonta o formulário)
  const chave = state.ok ? "ok" : "form";

  return (
    <form key={chave} action={action} className="vidro space-y-4 rounded-2xl p-5">
      <CampoSenha rotulo="Nova senha" name="senha" />
      <CampoSenha rotulo="Confirmar nova senha" name="confirmar" />
      <p className="text-xs text-muted">Pelo menos 8 caracteres.</p>
      {state.erro && <p role="alert" className="text-sm text-negative">{state.erro}</p>}
      {state.ok && <p role="status" className="text-sm text-positive">{state.ok}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
