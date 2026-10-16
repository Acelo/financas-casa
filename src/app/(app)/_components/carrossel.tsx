import { headers } from "next/headers";
import { abas, indiceDaAba, type Aba } from "@/lib/abas";
import { Dashboard } from "../dashboard/tela";
import { JurosObra } from "../juros-obra/tela";
import { Receitas } from "../receitas/tela";
import { Recorrentes } from "../recorrentes/tela";
import { Reservas } from "../reservas/tela";
import { ContasDoMes } from "../tela";
import { CarrosselCliente } from "./carrossel-cliente";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Cada aba renderizada como um painel. Recebem todas o mesmo searchParams:
// cada tela lê só o que lhe interessa (Contas e Receitas compartilham ?mes).
function Tela({ href, searchParams }: { href: Aba } & Props) {
  switch (href) {
    case "/":
      return <ContasDoMes searchParams={searchParams} />;
    case "/receitas":
      return <Receitas searchParams={searchParams} />;
    case "/recorrentes":
      return <Recorrentes />;
    case "/juros-obra":
      return <JurosObra />;
    case "/reservas":
      return <Reservas searchParams={searchParams} />;
    case "/dashboard":
      return <Dashboard searchParams={searchParams} />;
  }
}

// Carrossel híbrido: no celular, renderiza a aba atual e as duas vizinhas,
// para que ao arrastar a próxima tela já apareça sob o dedo. No PC (sem
// gesto de arrastar) renderiza só a atual, sem custo extra.
export async function Carrossel({ aba, searchParams }: { aba: Aba } & Props) {
  const ua = (await headers()).get("user-agent") ?? "";
  const celular = /iPhone|iPod|Android|Mobile/i.test(ua);

  const i = indiceDaAba(aba);
  const indices = (celular ? [i - 1, i, i + 1] : [i]).filter((j) => j >= 0 && j < abas.length);

  return (
    <CarrosselCliente
      atual={indices.indexOf(i)}
      paineis={indices.map((j) => ({
        href: abas[j].href,
        curto: abas[j].curto,
        conteudo: <Tela href={abas[j].href} searchParams={searchParams} />,
      }))}
    />
  );
}
