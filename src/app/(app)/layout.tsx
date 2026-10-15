import Link from "next/link";
import { sair } from "../login/actions";

const menu = [
  { href: "/", label: "Contas do mês" },
  { href: "/receitas", label: "Receitas" },
  { href: "/recorrentes", label: "Recorrentes" },
  { href: "/juros-obra", label: "Juros de obra" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">Finanças da Casa</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2 py-1 text-muted hover:bg-background hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <button className="text-sm text-muted hover:text-foreground">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
