// Tema claro/escuro. Sem escolha salva, segue o do aparelho; com escolha
// (menu do usuário), usa a escolha. Fica no localStorage deste aparelho.

export const CHAVE_TEMA = "koda-tema"; // "claro" | "escuro" | ausente = sistema
export type Preferencia = "claro" | "escuro" | null;

// Roda no <head> antes da tela aparecer (evita piscar no tema errado).
// Também ajusta a cor da barra de status/navegador.
export const scriptTema = `(function(){
  var m = window.matchMedia("(prefers-color-scheme: dark)");
  function aplicar(){
    var p = null;
    try { p = localStorage.getItem("${CHAVE_TEMA}"); } catch (e) {}
    var escuro = p ? p === "escuro" : m.matches;
    var r = document.documentElement;
    r.setAttribute("data-theme", escuro ? "dark" : "light");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
    meta.content = escuro ? "#0b0a09" : "#f7f4ee";
  }
  aplicar();
  if (m.addEventListener) m.addEventListener("change", aplicar);
  window.__kodaAplicarTema = aplicar;
})();`;

export function lerPreferencia(): Preferencia {
  try {
    const p = localStorage.getItem(CHAVE_TEMA);
    return p === "claro" || p === "escuro" ? p : null;
  } catch {
    return null;
  }
}

export function temaAtual(): "claro" | "escuro" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "escuro" : "claro";
}

export function definirPreferencia(p: Preferencia) {
  try {
    if (p) localStorage.setItem(CHAVE_TEMA, p);
    else localStorage.removeItem(CHAVE_TEMA);
  } catch {
    // Sem localStorage (modo privado): aplica só nesta visita
    document.documentElement.setAttribute("data-theme", p === "escuro" ? "dark" : "light");
    return;
  }
  (window as unknown as { __kodaAplicarTema?: () => void }).__kodaAplicarTema?.();
}
