"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { itens } from "./menu";

// Gestos do celular:
// * puxar para baixo no topo da página -> recarrega os dados da tela
//   (só no app instalado; no Safari normal o próprio navegador já faz isso)
// * deslizar para os lados -> vai para a aba anterior/seguinte
// Toques que começam em campos, gráficos, tabelas roláveis ou em elementos
// marcados com data-sem-gesto não disparam nada.

const PUXAR_LIMITE = 70; // px puxados para recarregar
const DESLIZAR_MIN = 70; // px na horizontal para trocar de aba
const BORDA = 24; // ignora toques colados na borda (gesto de voltar do iOS)

function ehMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function ehAppInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function bloqueado(alvo: EventTarget | null) {
  if (!(alvo instanceof Element)) return false;
  // Botões e linhas clicáveis não bloqueiam: arrastar já cancela o toque
  if (alvo.closest("input, textarea, select, svg, [data-sem-gesto]")) return true;
  // Algo que rola na horizontal (tabela larga, lista de filtros)
  for (let el: Element | null = alvo; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 2) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

export function Gestos({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [recarregando, startTransition] = useTransition();
  const [puxado, setPuxado] = useState(0);
  const conteudo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x0 = 0;
    let y0 = 0;
    let modo: "nada" | "puxar" | "deslizar" | "indefinido" = "nada";

    const indice = () => {
      // Lido na hora do gesto: a URL atual já reflete a última navegação
      const p = window.location.pathname;
      return itens.findIndex((i) => (i.href === "/" ? p === "/" : p.startsWith(i.href)));
    };

    const mover = (dx: number) => {
      if (conteudo.current) {
        conteudo.current.style.transition = "none";
        conteudo.current.style.transform = dx ? `translateX(${dx * 0.35}px)` : "";
      }
    };
    const soltar = () => {
      if (conteudo.current) {
        conteudo.current.style.transition = "transform 180ms ease-out";
        conteudo.current.style.transform = "";
      }
    };

    function inicio(e: TouchEvent) {
      if (!ehMobile() || e.touches.length !== 1 || bloqueado(e.target)) {
        modo = "nada";
        return;
      }
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
      modo = "indefinido";
    }

    function meio(e: TouchEvent) {
      if (modo === "nada") return;
      const t = e.touches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;

      if (modo === "indefinido") {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const naBorda = x0 < BORDA || x0 > window.innerWidth - BORDA;
        if (Math.abs(dx) > Math.abs(dy) * 1.5 && !naBorda) modo = "deslizar";
        else if (dy > 0 && window.scrollY <= 0 && ehAppInstalado()) modo = "puxar";
        else modo = "nada";
      }

      if (modo === "deslizar") {
        e.preventDefault(); // não rolar a página enquanto desliza
        const i = indice();
        const temDestino = (dx < 0 && i < itens.length - 1) || (dx > 0 && i > 0);
        mover(temDestino ? dx : dx * 0.25);
      } else if (modo === "puxar") {
        if (window.scrollY > 0 || dy <= 0) {
          setPuxado(0);
          return;
        }
        e.preventDefault(); // evita o "elástico" do iOS enquanto puxa
        setPuxado(Math.min(dy * 0.5, PUXAR_LIMITE * 1.4));
      }
    }

    function fim(e: TouchEvent) {
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;

      if (modo === "deslizar") {
        soltar();
        if (Math.abs(dx) >= DESLIZAR_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
          const i = indice();
          const destino = itens[dx < 0 ? i + 1 : i - 1];
          if (i >= 0 && destino) {
            // Contas e Receitas compartilham o mês escolhido
            const mes = new URLSearchParams(window.location.search).get("mes");
            const levaMes = mes && (destino.href === "/" || destino.href === "/receitas");
            router.push(levaMes ? `${destino.href}?mes=${mes}` : destino.href);
          }
        }
      } else if (modo === "puxar") {
        if (dy * 0.5 >= PUXAR_LIMITE) {
          startTransition(() => router.refresh());
        }
        setPuxado(0);
      }
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
