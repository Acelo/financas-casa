"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { indiceDaAba } from "@/lib/abas";
import { bloqueado, ehAppInstalado, ehMobile, navegacao, semAnimacao } from "./gestos-util";

// Gestos do celular que valem para todas as abas:
// * puxar para baixo no topo da página -> recarrega os dados da tela
//   (só no app instalado; no Safari normal o próprio navegador já faz isso)
// * troca de aba pelo menu de baixo -> a nova tela entra pelo lado da
//   posição dela na barra
// O deslizar entre abas fica no carrossel (carrossel-cliente.tsx).

const PUXAR_LIMITE = 70; // px puxados para recarregar
const ENTRADA_MS = 220;

export function Gestos({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [recarregando, startTransition] = useTransition();
  const [puxado, setPuxado] = useState(0);
  const conteudo = useRef<HTMLDivElement>(null);
  const caminhoAnterior = useRef(pathname);

  useEffect(() => {
    const anterior = caminhoAnterior.current;
    caminhoAnterior.current = pathname;
    const el = conteudo.current;
    const porCarrossel = navegacao.porCarrossel;
    navegacao.porCarrossel = false;
    if (!el || anterior === pathname || porCarrossel || semAnimacao() || !ehMobile()) return;

    const de = indiceDaAba(anterior);
    const para = indiceDaAba(pathname);
    if (de < 0 || para < 0 || de === para) return;
    const s = para > de ? 1 : -1;
    el.animate(
      [
        { transform: `translateX(${s * 30}%)`, opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: ENTRADA_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [pathname]);

  useEffect(() => {
    let y0 = 0;
    let x0 = 0;
    let modo: "nada" | "indefinido" | "puxar" = "nada";

    function inicio(e: TouchEvent) {
      if (!ehMobile() || !ehAppInstalado() || e.touches.length !== 1 || bloqueado(e.target) || window.scrollY > 0) {
        modo = "nada";
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      modo = "indefinido";
    }

    function meio(e: TouchEvent) {
      if (modo === "nada") return;
      const dx = e.touches[0].clientX - x0;
      const dy = e.touches[0].clientY - y0;
      if (modo === "indefinido") {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        modo = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5 ? "puxar" : "nada";
        if (modo === "nada") return;
      }
      if (window.scrollY > 0 || dy <= 0) {
        setPuxado(0);
        return;
      }
      e.preventDefault(); // evita o "elástico" do iOS enquanto puxa
      setPuxado(Math.min(dy * 0.5, PUXAR_LIMITE * 1.4));
    }

    function fim(e: TouchEvent) {
      if (modo === "puxar" && (e.changedTouches[0].clientY - y0) * 0.5 >= PUXAR_LIMITE) {
        startTransition(() => router.refresh());
      }
      setPuxado(0);
      modo = "nada";
    }

    document.addEventListener("touchstart", inicio, { passive: true });
    document.addEventListener("touchmove", meio, { passive: false });
    document.addEventListener("touchend", fim, { passive: true });
    document.addEventListener("touchcancel", fim, { passive: true });
    return () => {
      document.removeEventListener("touchstart", inicio);
      document.removeEventListener("touchmove", meio);
      document.removeEventListener("touchend", fim);
      document.removeEventListener("touchcancel", fim);
    };
  }, [router]);

  const visivel = recarregando || puxado > 0;
  const pronto = puxado >= PUXAR_LIMITE;

  return (
    <>
      {visivel && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-20 flex justify-center"
          style={{ transform: `translateY(${recarregando ? 56 : puxado}px)` }}
        >
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow">
            <span
              className={`inline-block size-3.5 rounded-full border-2 border-accent border-t-transparent ${recarregando ? "animate-spin" : ""}`}
              style={recarregando ? undefined : { transform: `rotate(${puxado * 4}deg)` }}
            />
            {recarregando ? "Atualizando..." : pronto ? "Solte para atualizar" : "Puxe para atualizar"}
          </div>
        </div>
      )}
      <div ref={conteudo}>{children}</div>
    </>
  );
}
