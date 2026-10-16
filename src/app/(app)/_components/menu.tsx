"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { abas } from "@/lib/abas";

function useAtivo() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

// Menu no cabeçalho (PC/tablet)
export function MenuTopo() {
  const ativo = useAtivo();
  return (
    <nav className="hidden flex-1 gap-1 text-sm sm:flex">
      {abas.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-md px-2 py-1 ${
            ativo(item.href)
              ? "bg-background font-medium text-foreground"
              : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Barra fixa no rodapé (celular), respeitando a área da barra do iPhone
export function MenuRodape() {
  const ativo = useAtivo();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-6">
        {abas.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-3 text-center text-[11px] ${
              ativo(item.href) ? "font-semibold text-accent" : "text-muted"
            }`}
          >
            {item.curto}
          </Link>
        ))}
      </div>
    </nav>
  );
}
