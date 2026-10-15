import Link from "next/link";
import { sair } from "../login/actions";
import { Gestos } from "./_components/gestos";
import { MenuRodape, MenuTopo } from "./_components/menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="flex-1 font-semibold sm:flex-none">Finanças da Casa</span>
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
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 pt-6 pb-24 sm:pb-6">
        <Gestos>{children}</Gestos>
      </main>
      <MenuRodape />
    </div>
  );
}
