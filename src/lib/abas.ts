// Abas do app, na ordem do menu e do carrossel do celular. Fica fora dos
// componentes "use client" para poder ser lido também no servidor.
export const abas = [
  { href: "/", label: "Contas do mês", curto: "Contas" },
  { href: "/receitas", label: "Receitas", curto: "Receitas" },
  { href: "/recorrentes", label: "Recorrentes", curto: "Fixos" },
  { href: "/juros-obra", label: "Juros de obra", curto: "Juros" },
  { href: "/reservas", label: "Reservas", curto: "Reservas" },
  { href: "/dashboard", label: "Dashboard", curto: "Painel" },
] as const;

export type Aba = (typeof abas)[number]["href"];

export function indiceDaAba(caminho: string) {
  return abas.findIndex((a) => (a.href === "/" ? caminho === "/" : caminho.startsWith(a.href)));
}
