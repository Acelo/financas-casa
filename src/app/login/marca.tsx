"use client";

import { useState } from "react";

// Peças das telas "de fora" do app (login, esqueci a senha, nova senha):
// fundo escuro com a arte do Koda, nome dourado e campos com contorno dourado.
// Sempre escuras, independente do tema do aparelho.

export const campoMarca =
  "w-full rounded-xl border border-[#c9955a]/60 bg-[#0e0d0c]/80 py-3.5 pl-12 pr-12 text-base text-[#eee8df] placeholder:text-[#8a8276] outline-none transition-colors focus:border-[#e9c88f] focus:bg-[#13110f]";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
      {children}
    </svg>
  );
}

export function IconeUsuario() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

export function IconeEmail() {
  return (
    <Svg>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Svg>
  );
}

function IconeCadeado() {
  return (
    <Svg>
      <rect width="16" height="11" x="4" y="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </Svg>
  );
}

function IconeOlho({ riscado }: { riscado: boolean }) {
  return (
    <Svg>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
      {riscado && <path d="m3 3 18 18" />}
    </Svg>
  );
}

// Campo com ícone dourado à esquerda
export function CampoMarca({
  icone,
  rotulo,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icone: React.ReactNode; rotulo: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{rotulo}</span>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#e3b56f]">{icone}</span>
      <input {...props} placeholder={props.placeholder ?? rotulo} className={campoMarca} />
    </label>
  );
}

// Campo de senha com o olho para mostrar/esconder
export function CampoSenhaMarca({ rotulo, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="relative block">
      <span className="sr-only">{rotulo}</span>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#e3b56f]">
        <IconeCadeado />
      </span>
      <input {...props} type={ver ? "text" : "password"} placeholder={props.placeholder ?? rotulo} className={campoMarca} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={ver}
        className="absolute inset-y-0 right-3 flex items-center px-1 text-[#a49b8e] hover:text-[#e9c88f]"
      >
        {/* Olho aberto = "mostrar"; riscado = "esconder" */}
        <IconeOlho riscado={ver} />
      </button>
    </label>
  );
}

export function BotaoMarca({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="botao-ouro mt-2 w-full rounded-xl py-3.5 text-base font-semibold disabled:opacity-60">
      {children}
    </button>
  );
}

export function TelaMarca({ subtitulo = "Gestão Financeira Pessoal", children }: { subtitulo?: string; children: React.ReactNode }) {
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

      <div className="relative w-full max-w-md">
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
          <p className="mt-4 text-sm tracking-[0.22em] text-[#e9e1d4] sm:text-base">{subtitulo}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function MensagemMarca({ tipo, children }: { tipo: "erro" | "ok"; children: React.ReactNode }) {
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`text-center text-sm ${tipo === "erro" ? "text-[#f87171]" : "text-[#e9d3a8]"}`}>
      {children}
    </p>
  );
}
