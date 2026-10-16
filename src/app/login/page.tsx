"use client";

import { useActionState, useState } from "react";
import { entrar, type LoginState } from "./actions";

// Tela de entrada com a identidade Koda. Sempre escura (é o momento da
// marca), independente do tema do aparelho.

const campo =
  "w-full rounded-xl border border-[#c9955a]/60 bg-[#0e0d0c]/80 py-3.5 pl-12 pr-12 text-base text-[#eee8df] placeholder:text-[#8a8276] outline-none transition-colors focus:border-[#e9c88f] focus:bg-[#13110f]";

function IconeUsuario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconeCadeado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <rect width="16" height="11" x="4" y="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </svg>
  );
}

function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <path d="m3 3 18 18" />}
    </svg>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});
  const [verSenha, setVerSenha] = useState(false);

  return (
    <main
      className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden px-6 py-12 text-[#eee8df]"
      style={{ background: "#0b0a09" }}
    >
      {/* Arte do Koda. PC: na altura da tela, à esquerda, sumindo para a
          direita. Celular: no alto, sumindo para baixo atrás do formulário. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden bg-left bg-no-repeat sm:block"
        style={{
          width: "calc(100dvh * 484 / 1024)",
          backgroundImage: "url(/koda-arte.jpg)",
          backgroundSize: "auto 100%",
          maskImage: "linear-gradient(90deg, #000 30%, rgba(0,0,0,0.5) 65%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(90deg, #000 30%, rgba(0,0,0,0.5) 65%, transparent 96%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[68%] bg-cover bg-top opacity-60 sm:hidden"
        style={{
          backgroundImage: "url(/koda-arte.jpg)",
          maskImage: "linear-gradient(180deg, #000 35%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 35%, transparent 100%)",
        }}
      />

      <form action={action} className="relative w-full max-w-md space-y-4">
        <div className="mb-10 text-center">
          <h1
            className="font-marca text-6xl font-semibold tracking-[0.06em] sm:text-7xl"
            style={{
              background: "linear-gradient(180deg, #f3d9a6, #c9955a)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            KODA
          </h1>
          <div className="mx-auto mt-3 h-px w-20 bg-[#c9955a]" />
          <p className="mt-4 text-sm tracking-[0.22em] text-[#e9e1d4] sm:text-base">
            Gestão Financeira Pessoal
          </p>
        </div>

        <label className="relative block">
          <span className="sr-only">E-mail</span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#e3b56f]">
            <IconeUsuario />
          </span>
          <input name="email" type="email" autoComplete="email" required placeholder="E-mail" className={campo} />
        </label>

        <label className="relative block">
          <span className="sr-only">Senha</span>
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#e3b56f]">
            <IconeCadeado />
          </span>
          <input
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Senha"
            className={campo}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={verSenha}
            className="absolute inset-y-0 right-3 flex items-center px-1 text-[#a49b8e] hover:text-[#e9c88f]"
          >
            {/* Olho aberto = "mostrar"; riscado = "esconder" */}
            <IconeOlho aberto={!verSenha} />
          </button>
        </label>

        {state.erro && (
          <p role="alert" className="text-center text-sm text-[#f87171]">
            {state.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="botao-ouro mt-2 w-full rounded-xl py-3.5 text-base font-semibold disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
