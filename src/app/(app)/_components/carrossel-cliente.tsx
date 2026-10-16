"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { BORDA, bloqueado, ehMobile, hrefCom, navegacao, semAnimacao } from "./gestos-util";

type Painel = { href: string; curto: string; conteudo: ReactNode };

const LIMITE_FRACAO = 0.22; // arrastar 22% da largura troca de aba
const RAPIDO_PX = 30; // ...ou um "peteleco" rápido
const RAPIDO_MS = 250;
const DURACAO = 260;
const VAO = 16; // espaço entre as telas durante o arrasto (px)

// Painéis lado a lado: a aba atual (que define a altura da página) e as
// vizinhas, posicionadas à esquerda/direita. O trilho acompanha o dedo; ao
// soltar, desliza até a vizinha e só então a URL muda. Quando a resposta do
// servidor chega, o painel que já está na tela vira o "atual" (mesma key),
// sem piscar, e chegam as novas vizinhas.
export function CarrosselCliente({ atual, paineis }: { atual: number; paineis: Painel[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const raiz = useRef<HTMLDivElement>(null);

  const centro = paineis[atual]?.href;
  const [pos, setPos] = useState(atual);
  const [dx, setDx] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [topoVizinho, setTopoVizinho] = useState(0);

  // Chegou um novo conjunto de painéis (outra aba no centro): reposiciona
  // sem transição. O painel visível é o mesmo, só muda de índice.
  const [centroVisto, setCentroVisto] = useState(centro);
  if (centro !== centroVisto) {
    setCentroVisto(centro);
    setPos(atual);
    setDx(0);
    setAnimando(false);
  }

  // Valores atuais para os listeners nativos (registrados uma vez)
  const vivo = useRef({ pos, paineis, animando });
  useEffect(() => {
    vivo.current = { pos, paineis, animando };
  });

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let ultimoDx = 0;
    let modo: "nada" | "indefinido" | "deslizar" = "nada";

    const vizinho = (d: number) => {
      const { pos: p, paineis: ps } = vivo.current;
      const alvo = d < 0 ? p + 1 : p - 1;
      return alvo >= 0 && alvo < ps.length ? alvo : null;
    };

    function inicio(e: TouchEvent) {
      if (!ehMobile() || e.touches.length !== 1 || vivo.current.animando || bloqueado(e.target)) {
        modo = "nada";
        return;
      }
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
      t0 = Date.now();
      ultimoDx = 0;
      modo = x0 < BORDA || x0 > window.innerWidth - BORDA ? "nada" : "indefinido";
    }

    function meio(e: TouchEvent) {
      if (modo === "nada") return;
      const t = e.touches[0];
      const ddx = t.clientX - x0;
      const ddy = t.clientY - y0;

      if (modo === "indefinido") {
        if (Math.abs(ddx) < 10 && Math.abs(ddy) < 10) return;
        if (Math.abs(ddx) > Math.abs(ddy) * 1.5) {
          modo = "deslizar";
          // As vizinhas aparecem alinhadas ao que está na tela agora
          const topo = el!.getBoundingClientRect().top + window.scrollY;
          setTopoVizinho(Math.max(0, window.scrollY - topo));
        } else {
          modo = "nada";
          return;
        }
      }

      e.preventDefault(); // não rolar a página enquanto arrasta
      ultimoDx = vizinho(ddx) === null ? ddx * 0.25 : ddx; // "elástico" nas pontas
      setDx(ultimoDx);
    }

    function fim() {
      if (modo !== "deslizar") {
        modo = "nada";
        return;
      }
      modo = "nada";
      const largura = el!.clientWidth;
      const rapido = Math.abs(ultimoDx) > RAPIDO_PX && Date.now() - t0 < RAPIDO_MS;
      const alvo = Math.abs(ultimoDx) > largura * LIMITE_FRACAO || rapido ? vizinho(ultimoDx) : null;

      setAnimando(!semAnimacao());
      setDx(0);
      if (alvo !== null) {
        setPos(alvo);
        navegacao.porCarrossel = true;
        const href = hrefCom(vivo.current.paineis[alvo].href);
        startTransition(() => router.push(href));
      }
    }

    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", meio, { passive: false });
    el.addEventListener("touchend", fim, { passive: true });
    el.addEventListener("touchcancel", fim, { passive: true });
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", meio);
      el.removeEventListener("touchend", fim);
      el.removeEventListener("touchcancel", fim);
    };
  }, [router]);

  if (paineis.length === 1) return <>{paineis[0].conteudo}</>;

  return (
    <div ref={raiz} className="relative overflow-x-clip">
      <div
        className="relative"
        style={{
          transform: `translate3d(calc(${-pos * 100}% - ${pos * VAO}px + ${dx}px), 0, 0)`,
          transition: animando ? `transform ${DURACAO}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : "none",
          willChange: dx || animando ? "transform" : undefined,
        }}
        onTransitionEnd={() => setAnimando(false)}
      >
        {paineis.map((p, k) => {
          const ehCentro = k === atual;
          return (
            <section
              key={p.href}
              aria-label={p.curto}
              aria-hidden={k !== pos}
              inert={k !== pos}
              className="w-full"
              style={
                ehCentro
                  ? { position: "relative", left: `calc(${k * 100}% + ${k * VAO}px)` }
                  : {
                      position: "absolute",
                      left: `calc(${k * 100}% + ${k * VAO}px)`,
                      top: topoVizinho,
                      height: "100dvh",
                      overflow: "hidden",
                    }
              }
            >
              {p.conteudo}
            </section>
          );
        })}
      </div>
    </div>
  );
}
