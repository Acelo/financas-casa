"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";
import { BotaoMarca, CampoMarca, CampoSenhaMarca, IconeUsuario, MensagemMarca, TelaMarca } from "./marca";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <TelaMarca>
      <form action={action} className="space-y-4">
        <CampoMarca icone={<IconeUsuario />} rotulo="E-mail" name="email" type="email" autoComplete="email" required />
        <CampoSenhaMarca rotulo="Senha" name="senha" autoComplete="current-password" required />

        {state.erro && <MensagemMarca tipo="erro">{state.erro}</MensagemMarca>}

        <BotaoMarca type="submit" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </BotaoMarca>

        <p className="pt-2 text-center">
          <Link href="/login/esqueci" className="text-sm text-[#c9b48f] underline-offset-4 hover:text-[#e9c88f] hover:underline">
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </TelaMarca>
  );
}
