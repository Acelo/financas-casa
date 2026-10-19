"use client";

import Link from "next/link";
import { useActionState } from "react";
import { definirNovaSenha, type SenhaState } from "./actions";
import { BotaoMarca, CampoSenhaMarca, MensagemMarca } from "./marca";

// Os dois campos (nova senha + confirmar), usado na página do link do
// e-mail. Ao dar certo, mostra o botão para entrar no app.
export function FormNovaSenha() {
  const [state, action, pending] = useActionState<SenhaState, FormData>(definirNovaSenha, {});

  if (state.ok) {
    return (
      <div className="space-y-4">
        <MensagemMarca tipo="ok">Senha alterada. Você já está conectado.</MensagemMarca>
        <Link href="/" className="botao-ouro block w-full rounded-xl py-3.5 text-center text-base font-semibold">
          Ir para o Koda
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <CampoSenhaMarca rotulo="Nova senha" name="senha" autoComplete="new-password" minLength={8} required />
      <CampoSenhaMarca rotulo="Confirmar nova senha" name="confirmar" autoComplete="new-password" minLength={8} required />
      <p className="text-center text-xs text-[#a49b8e]">Pelo menos 8 caracteres.</p>

      {state.erro && <MensagemMarca tipo="erro">{state.erro}</MensagemMarca>}

      <BotaoMarca type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </BotaoMarca>
    </form>
  );
}
