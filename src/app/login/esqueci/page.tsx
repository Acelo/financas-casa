"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { pedirRedefinicao, type SenhaState } from "../actions";
import { BotaoMarca, CampoMarca, IconeEmail, MensagemMarca, TelaMarca } from "../marca";

function Formulario() {
  const [state, action, pending] = useActionState<SenhaState, FormData>(pedirRedefinicao, {});
  // Voltou do link do e-mail com erro (expirado ou já usado)
  const linkRuim = useSearchParams().get("erro") === "link";

  return (
    <form action={action} className="space-y-4">
      <p className="text-center text-sm text-[#cfc6b8]">
        Informe seu e-mail. Vamos enviar um link para você criar uma nova senha.
      </p>

      {linkRuim && !state.ok && !state.erro && (
        <MensagemMarca tipo="erro">O link expirou ou já foi usado. Peça um novo abaixo.</MensagemMarca>
      )}

      <CampoMarca icone={<IconeEmail />} rotulo="E-mail" name="email" type="email" autoComplete="email" required />

      {state.erro && <MensagemMarca tipo="erro">{state.erro}</MensagemMarca>}
      {state.ok && <MensagemMarca tipo="ok">{state.ok}</MensagemMarca>}

      <BotaoMarca type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </BotaoMarca>

      <p className="pt-2 text-center">
        <Link href="/login" className="text-sm text-[#c9b48f] underline-offset-4 hover:text-[#e9c88f] hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}

export default function EsqueciSenha() {
  return (
    <TelaMarca subtitulo="Esqueci minha senha">
      <Suspense>
        <Formulario />
      </Suspense>
    </TelaMarca>
  );
}
