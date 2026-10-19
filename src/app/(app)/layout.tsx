import { createClient } from "@/lib/supabase/server";
import { Gestos } from "./_components/gestos";
import { LinkAviso } from "./_components/link-aviso";
import { MenuRodape, MenuTopo } from "./_components/menu";
import { MenuUsuario } from "./_components/menu-usuario";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Nome e e-mail para o menu do usuário
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const { data: membro } = await supabase.from("membros").select("nome").ilike("email", email).maybeSingle();

  return (
    <div className="flex flex-1 flex-col">
      <header className="vidro-cabecalho sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <MenuUsuario nome={(membro?.nome as string | undefined) ?? ""} email={email} />
          <LinkAviso href="/" rotulo="Menu" aria-label="Koda, início" className="texto-ouro flex-1 font-marca text-xl font-semibold tracking-[0.16em] sm:flex-none">
            KODA
          </LinkAviso>
          <MenuTopo />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 pt-6 pb-32 sm:pb-6">
        <Gestos>{children}</Gestos>
      </main>
      <MenuRodape />
    </div>
  );
}
