import { createClient } from "@/lib/supabase/server";

// Backup manual: devolve todas as tabelas em um arquivo JSON e registra o
// download em public.backups. As regras de acesso (RLS) garantem que só
// membros conseguem ler os dados.

const TABELAS = [
  "membros",
  "contas",
  "conta_valores",
  "lancamentos",
  "receitas",
  "juros_obra",
  "reservas",
  "reserva_movimentos",
  "backups",
] as const;

const PAGINA = 1000; // limite de linhas por consulta da Supabase

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const tabelas: Record<string, unknown[]> = {};
  for (const tabela of TABELAS) {
    const linhas: unknown[] = [];
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .range(de, de + PAGINA - 1);
      if (error) {
        return Response.json({ erro: `${tabela}: ${error.message}` }, { status: 500 });
      }
      linhas.push(...data);
      if (data.length < PAGINA) break;
    }
    tabelas[tabela] = linhas;
  }

  const agora = new Date();
  const carimbo = agora
    .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
    .slice(0, 16)
    .replace(" ", "_")
    .replace(":", "");
  const arquivo = `financas-casa_${carimbo}.json`;

  const corpo = JSON.stringify(
    { app: "financas-casa", versao: 1, gerado_em: agora.toISOString(), tabelas },
    null,
    2,
  );

  await supabase.from("backups").insert({
    tipo: "manual",
    arquivo,
    tamanho_bytes: new TextEncoder().encode(corpo).length,
  });

  return new Response(corpo, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
