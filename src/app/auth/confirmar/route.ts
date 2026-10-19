import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino do link do e-mail de redefinição de senha.
// * token_hash + type (modelo de e-mail do Koda): funciona em qualquer
//   aparelho, mesmo abrindo o e-mail em outro lugar
// * code (modelo padrão da Supabase): funciona no mesmo navegador do pedido
// Deu certo: cria a sessão de recuperação e segue para "next".
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Só caminhos internos (evita redirecionar para outro site)
  const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && tipo) {
    ok = !(await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(new URL(ok ? destino : "/login/esqueci?erro=link", request.url));
}
