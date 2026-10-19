"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { avisarAbrindo } from "./aviso-navegacao";
import { icones } from "./icones";

// Ordem das abas: também é a ordem do deslizar para os lados no celular
export const itens = [
  { href: "/contas", label: "Contas do mês", curto: "Contas" },
  { href: "/receitas", label: "Receitas", curto: "Receitas" },
  { href: "/recorrentes", label: "Recorrentes", curto: "Fixos" },
  { href: "/juros-obra", label: "Juros de obra", curto: "Juros" },
  { href: "/reservas", label: "Reservas", curto: "Reservas" },
  { href: "/dashboard", label: "Dashboard", curto: "Painel" },
] as const;

function indiceAtivo(path: string) {
  return itens.findIndex((i) => path.startsWith(i.href));
}

// Menu no cabeçalho (PC/tablet)
export function MenuTopo() {
  const pathname = usePathname();
  const ativo = indiceAtivo(pathname);
  // Na tela inicial os próprios atalhos são o menu
  if (pathname === "/") return <div className="hidden flex-1 sm:block" />;
  return (
    <nav className="hidden flex-1 gap-1 text-sm sm:flex">
      {itens.map((item, i) => {
        const Icone = icones[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => avisarAbrindo(item.curto, item.href)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 ${
              i === ativo
                ? "bg-background font-medium text-foreground"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            <Icone className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Barra flutuante de vidro no rodapé (celular). A pílula de destaque desliza
// até a aba tocada na hora do toque, sem esperar a página carregar.
export function MenuRodape() {
  const pathname = usePathname();
  const ativo = indiceAtivo(pathname);
  const [tocado, setTocado] = useState<number | null>(null);

  // A página chegou: volta a seguir a URL (que já é a aba tocada)
  const [caminhoVisto, setCaminhoVisto] = useState(pathname);
  if (pathname !== caminhoVisto) {
    setCaminhoVisto(pathname);
    setTocado(null);
  }

  const destaque = tocado ?? ativo;

  // Tela inicial: os atalhos já são o menu, a barra seria redundante
  if (pathname === "/") return null;

  return (
    <nav
      aria-label="Abas"
      className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:hidden"
    >
      <div className="vidro-barra relative grid grid-cols-6 rounded-[26px] p-1.5">
        {destaque >= 0 && (
          <span
            aria-hidden
            className="vidro-pilula pointer-events-none absolute inset-y-1.5 left-1.5 rounded-[20px]"
            style={{
              width: "calc((100% - 12px) / 6)",
              transform: `translateX(${destaque * 100}%)`,
              // Leve "passada do ponto" no fim: dá a sensação de líquido
              transition: "transform 420ms cubic-bezier(0.34, 1.36, 0.5, 1)",
            }}
          />
        )}
        {itens.map((item, i) => {
          const Icone = icones[item.href];
          const ehAtivo = i === destaque;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setTocado(i);
                avisarAbrindo(item.curto, item.href);
              }}
              aria-current={i === ativo ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-[20px] py-2 transition-colors duration-300 ${
                ehAtivo ? "text-foreground" : "text-muted"
              }`}
            >
              <span className={`text-[11px] leading-none ${ehAtivo ? "font-semibold" : "font-medium"}`}>
                {item.curto}
              </span>
              <Icone className={`size-[22px] transition-transform duration-300 ${ehAtivo ? "scale-105" : ""}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
