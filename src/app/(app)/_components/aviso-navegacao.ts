"use client";

import { useSyncExternalStore } from "react";

// Aviso "Abrindo …" mostrado entre o toque num link e a chegada da tela.
// No app instalado no iPhone não há barra de endereço indicando que está
// carregando; sem isso o toque parece não ter funcionado.
// Quem mostra é o componente Gestos; quem avisa são os links do app.

let rotulo: string | null = null;
let limite: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function emitir() {
  ouvintes.forEach((o) => o());
}

export function avisarAbrindo(nome: string, href: string) {
  // Tocar na aba em que já está não navega: não mostra nada
  if (typeof window !== "undefined" && window.location.pathname === href) return;
  rotulo = nome;
  clearTimeout(limite);
  // Se a navegação travar ou falhar, o aviso some sozinho
  limite = setTimeout(limparAviso, 10_000);
  emitir();
}

export function limparAviso() {
  if (rotulo === null) return;
  rotulo = null;
  clearTimeout(limite);
  emitir();
}

export function useAvisoNavegacao() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => rotulo,
    () => null,
  );
}
