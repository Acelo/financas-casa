// Ícones das abas (traços no estilo Lucide, licença ISC). SVG inline para
// não depender de biblioteca; herdam a cor do texto (currentColor).

type Props = { className?: string };

function Base({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export const icones = {
  // Contas: carteira
  "/": (p: Props) => (
    <Base {...p}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </Base>
  ),
  // Receitas: tendência de alta
  "/receitas": (p: Props) => (
    <Base {...p}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </Base>
  ),
  // Fixos: calendário com check
  "/recorrentes": (p: Props) => (
    <Base {...p}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </Base>
  ),
  // Juros: porcentagem
  "/juros-obra": (p: Props) => (
    <Base {...p}>
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </Base>
  ),
  // Reservas: escudo com cifrão
  "/reservas": (p: Props) => (
    <Base {...p}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M14 9.5h-2.75a1.5 1.5 0 0 0 0 3h1.5a1.5 1.5 0 0 1 0 3H10" />
      <path d="M12 8v1.5" />
      <path d="M12 15.5V17" />
    </Base>
  ),
  // Painel: grade
  "/dashboard": (p: Props) => (
    <Base {...p}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Base>
  ),
} as const;
