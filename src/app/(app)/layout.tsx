import Link from "next/link";
import { sair } from "../login/actions";
import { Gestos } from "./_components/gestos";
import { MenuRodape, MenuTopo } from "./_components/menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="vidro-cabecalho sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" aria-label="Koda, início" className="texto-ouro flex-1 font-marca text-xl font-semibold tracking-[0.16em] sm:flex-none">
            KODA
          </Link>
          <MenuTopo />
          <Link href="/backup" className="text-sm text-muted hover:text-foreground">
            Backup
          </Link>
          <form action={sair}>
            <button className="text-sm text-muted hover:text-foreground">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 pt-6 pb-32 sm:pb-6">
        <Gestos>{children}</Gestos>
      </main>
      <MenuRodape />
    </div>
  );
}
