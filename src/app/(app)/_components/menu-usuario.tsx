"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { definirPreferencia, lerPreferencia, temaAtual, type Preferencia } from "@/lib/tema";
import { sair } from "../../login/actions";
import { avisarAbrindo } from "./aviso-navegacao";

// Menu do usuário: botão de três linhas ao lado do KODA abre uma gaveta que
// desliza da esquerda, ocupando parte da tela.

function Icone({ d, className = "size-5" }: { d: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {d}
    </svg>
  );
}

const icones = {
  menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>,
  fechar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  inicio: <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  senha: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>,
  backup: <><path d="M12 13v8" /><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="m8 17 4-4 4 4" /></>,
  sair: <><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></>,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>,
  lua: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
};

export function MenuUsuario({ nome, email }: { nome: string; email: string }) {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<"claro" | "escuro">("escuro");
  const [preferencia, setPreferencia] = useState<Preferencia>(null);
  const pathname = usePathname();
  const gaveta = useRef<HTMLDivElement>(null);
  // A gaveta vai direto no <body>: dentro do cabeçalho (que tem
  // backdrop-filter) um "fixed" ficaria preso à área do cabeçalho
  const noNavegador = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Fecha ao trocar de página
  const [caminhoVisto, setCaminhoVisto] = useState(pathname);
  if (pathname !== caminhoVisto) {
    setCaminhoVisto(pathname);
    setAberto(false);
  }

  // Esc fecha; a página de trás não rola enquanto a gaveta está aberta
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    gaveta.current?.focus();
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [aberto]);

  // Arrastar a gaveta para a esquerda fecha
  useEffect(() => {
    const el = gaveta.current;
    if (!el) return;
    let x0 = 0;
    const ini = (e: TouchEvent) => { x0 = e.touches[0].clientX; };
    const fim = (e: TouchEvent) => { if (x0 - e.changedTouches[0].clientX > 60) setAberto(false); };
    el.addEventListener("touchstart", ini, { passive: true });
    el.addEventListener("touchend", fim, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ini);
      el.removeEventListener("touchend", fim);
    };
  }, [noNavegador]);

  function abrir() {
    setTema(temaAtual());
    setPreferencia(lerPreferencia());
    setAberto(true);
  }

  function alternarTema() {
    const novo = tema === "escuro" ? "claro" : "escuro";
    definirPreferencia(novo);
    setTema(novo);
    setPreferencia(novo);
  }

  function seguirAparelho() {
    definirPreferencia(null);
    setPreferencia(null);
    setTema(temaAtual());
  }

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-background/60";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className="-ml-1 rounded-lg p-1.5 text-muted hover:text-foreground"
      >
        <Icone d={icones.menu} className="size-6" />
      </button>

      {noNavegador && createPortal(<>
      {/* Fundo escurecido: tocar fora fecha */}
      <div
        aria-hidden
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-30 bg-black/45 transition-opacity duration-300 ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div
        ref={gaveta}
        role="dialog"
        aria-modal="true"
        aria-label="Menu do usuário"
        tabIndex={-1}
        inert={!aberto}
        data-sem-gesto
        className={`vidro-gaveta fixed inset-y-0 left-0 z-40 flex w-[82%] max-w-[320px] flex-col rounded-r-3xl pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),16px)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${aberto ? "translate-x-0" : "-translate-x-[105%]"}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="texto-ouro font-marca text-xl font-semibold tracking-[0.16em]">KODA</span>
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="rounded-lg p-1.5 text-muted hover:text-foreground">
            <Icone d={icones.fechar} />
          </button>
        </div>

        <div className="px-5 pb-4">
          {nome && <p className="font-medium">{nome}</p>}
          <p className="truncate text-xs text-muted">{email}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <Link href="/" onClick={() => avisarAbrindo("Menu", "/")} className={item}>
            <Icone d={icones.inicio} /> Início
          </Link>
          <Link href="/conta/senha" onClick={() => avisarAbrindo("Trocar senha", "/conta/senha")} className={item}>
            <Icone d={icones.senha} /> Trocar senha
          </Link>
          <Link href="/backup" onClick={() => avisarAbrindo("Backup", "/backup")} className={item}>
            <Icone d={icones.backup} /> Backup
          </Link>

          {/* Tema: interruptor com sol/lua */}
          <div className="rounded-xl px-3 py-3">
            <div className="flex items-center gap-3">
              <Icone d={tema === "escuro" ? icones.lua : icones.sol} />
              <span className="flex-1">Modo noturno</span>
              <button
                type="button"
                role="switch"
                aria-checked={tema === "escuro"}
                aria-label="Modo noturno"
                onClick={alternarTema}
                className={`relative h-8 w-14 rounded-full border border-border transition-colors ${tema === "escuro" ? "bg-accent" : "bg-background"}`}
              >
                <span
                  className={`absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-foreground shadow transition-[left] duration-300 ${tema === "escuro" ? "left-[calc(100%-1.75rem)]" : "left-1"}`}
                >
                  <Icone d={tema === "escuro" ? icones.lua : icones.sol} className="size-3.5" />
                </span>
              </button>
            </div>
            <p className="mt-1 pl-8 text-xs text-muted">
              {preferencia ? (
                <button type="button" onClick={seguirAparelho} className="underline underline-offset-2">
                  Seguir o tema do aparelho
                </button>
              ) : (
                "Seguindo o tema do aparelho"
              )}
            </p>
          </div>
        </nav>

        <form action={sair} className="px-3">
          <button className={`${item} text-negative`}>
            <Icone d={icones.sair} /> Sair
          </button>
        </form>
      </div>
      </>, document.body)}
    </>
  );
}
