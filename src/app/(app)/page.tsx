import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, formatBRL, mesAtual, nomeDoMes } from "@/lib/format";
import { comSinal } from "@/lib/reservas";
import { icones } from "./_components/icones";

// Tela inicial: um resumo do mês e um atalho para cada aba. Não tem barra
// de abas nem deslizar para os lados (os atalhos já são o menu).

type Atalho = {
  href: "/contas" | "/receitas" | "/recorrentes" | "/juros-obra" | "/reservas" | "/dashboard";
  titulo: string;
  destaque: string;
  detalhe: string;
  tom?: "positivo" | "negativo";
};

function saudacao() {
  const hora = Number(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }),
  );
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Inicio() {
  const supabase = await createClient();
  const mes = mesAtual();
  const competencia = competenciaParaData(mes);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [membroRes, lancRes, recRes, jurosRes, movRes, fixosRes] = await Promise.all([
    supabase.from("membros").select("nome").ilike("email", user?.email ?? "").maybeSingle(),
    supabase.from("lancamentos").select("valor_previsto, valor_pago, status").eq("competencia", competencia),
    supabase.from("receitas").select("valor").eq("competencia", competencia),
    supabase.from("juros_obra").select("competencia, valor").order("competencia", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("reserva_movimentos").select("tipo, valor, reservas!inner(ativo)").eq("reservas.ativo", true),
    supabase.from("contas").select("id", { count: "exact", head: true }).eq("ativo", true).eq("recorrente", true),
  ]);

  const lancs = lancRes.data ?? [];
  const totalContas = lancs.reduce((s, l) => s + Number(l.valor_pago ?? l.valor_previsto), 0);
  const pendentes = lancs.filter((l) => l.status === "pendente");
  const faltaPagar = pendentes.reduce((s, l) => s + Number(l.valor_previsto), 0);
  const receitas = (recRes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
  const saldo = receitas - totalContas;
  const reserva = (movRes.data ?? []).reduce(
    (s, m) => s + comSinal({ tipo: m.tipo as "aporte", valor: Number(m.valor) }),
    0,
  );
  const juros = jurosRes.data;
  const nome = (membroRes.data?.nome as string | undefined) ?? "";

  const atalhos: Atalho[] = [
    {
      href: "/contas",
      titulo: "Contas do mês",
      destaque: lancs.length ? formatBRL(faltaPagar) : "—",
      detalhe: lancs.length
        ? pendentes.length
          ? `falta pagar · ${pendentes.length} pendente${pendentes.length > 1 ? "s" : ""}`
          : "tudo pago"
        : "mês ainda não gerado",
      tom: !lancs.length ? undefined : pendentes.length ? "negativo" : "positivo",
    },
    {
      href: "/receitas",
      titulo: "Receitas",
      destaque: formatBRL(receitas),
      detalhe: receitas ? "entrou este mês" : "nada lançado ainda",
    },
    {
      href: "/recorrentes",
      titulo: "Recorrentes",
      destaque: `${fixosRes.count ?? 0}`,
      detalhe: "contas e assinaturas ativas",
    },
    {
      href: "/juros-obra",
      titulo: "Juros de obra",
      destaque: juros ? formatBRL(juros.valor) : "—",
      detalhe: juros ? `último: ${nomeDoMes(juros.competencia.slice(0, 7)).toLowerCase()}` : "nenhum mês lançado",
    },
    {
      href: "/reservas",
      titulo: "Reservas",
      destaque: formatBRL(reserva),
      detalhe: "saldo registrado",
    },
    {
      href: "/dashboard",
      titulo: "Dashboard",
      destaque: "Gráficos",
      detalhe: "histórico e evolução",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-1 pt-2">
        <p className="text-sm text-muted">
          {saudacao()}
          {nome && `, ${nome}`}
        </p>
        <h1 className="text-2xl font-semibold">{nomeDoMes(mes)}</h1>
      </section>

      {/* Fechamento do mês: receitas menos contas */}
      <Link href="/receitas" className="vidro block rounded-2xl p-5 transition-transform active:scale-[0.99]">
        <p className="text-xs text-muted">{saldo >= 0 ? "Sobra do mês" : "Falta no mês"}</p>
        <p className={`text-3xl font-semibold ${saldo >= 0 ? "text-positive" : "text-negative"}`}>
          {formatBRL(saldo)}
        </p>
        <p className="mt-1 text-xs text-muted">
          Receitas {formatBRL(receitas)} · Contas {formatBRL(totalContas)}
        </p>
      </Link>

      <nav aria-label="Atalhos" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {atalhos.map((a) => {
          const Icone = icones[a.href];
          return (
            <Link
              key={a.href}
              href={a.href}
              className="vidro group flex min-h-36 flex-col rounded-2xl p-4 transition-transform active:scale-[0.98]"
            >
              <span className="vidro-pilula mb-3 flex size-10 items-center justify-center rounded-xl text-accent">
                <Icone className="size-5" />
              </span>
              <span className="font-medium">{a.titulo}</span>
              <span
                className={`mt-auto pt-2 text-lg font-semibold ${
                  a.tom === "negativo" ? "text-negative" : a.tom === "positivo" ? "text-positive" : ""
                }`}
              >
                {a.destaque}
              </span>
              <span className="text-xs text-muted">{a.detalhe}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
