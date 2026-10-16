// Utilitários compartilhados pelos gestos (puxar para atualizar) e pelo
// carrossel de abas.

export const BORDA = 24; // ignora toques colados na borda (gesto de voltar do iOS)

// O carrossel avisa que a navegação foi dele, para a animação de entrada
// de aba (usada nos toques no menu) não rodar por cima
export const navegacao = { porCarrossel: false };

export function ehMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function ehAppInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function semAnimacao() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Toques que começam em campos, gráficos, tabelas roláveis ou em elementos
// marcados com data-sem-gesto não disparam gesto nenhum
export function bloqueado(alvo: EventTarget | null) {
  if (!(alvo instanceof Element)) return false;
  // Botões e linhas clicáveis não bloqueiam: arrastar já cancela o toque
  if (alvo.closest("input, textarea, select, svg, [data-sem-gesto]")) return true;
  for (let el: Element | null = alvo; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 2) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

// Contas e Receitas compartilham o mês escolhido
export function hrefCom(href: string) {
  const mes = new URLSearchParams(window.location.search).get("mes");
  return mes && (href === "/" || href === "/receitas") ? `${href}?mes=${mes}` : href;
}
