import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, mesAtual } from "@/lib/format";
import { RecorrentesLista, type ContaView } from "./recorrentes-lista";

type ContaBanco = Omit<ContaView, "valor_atual" | "ultima_parcela" | "ultimo_pago" | "historico"> & {
  conta_valores: { valor: number; vigente_desde: string }[];
  lancamentos: { parcela: number | null; valor_pago: number | null; competencia: string }[];
};

export default async function Recorrentes() {
  const supabase = await createClient();
  const hoje = competenciaParaData(mesAtual());

  const { data: ultimoJuros } = await supabase
    .from("juros_obra")
    .select("valor")
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("contas")
    .select(
      "id, nome, categoria, tipo_valor, origem_valor, dia_vencimento, forma_pagamento, gera_lancamento, ativo, parcelas_totais, obs, conta_valores(valor, vigente_desde), lancamentos(parcela, valor_pago, competencia)",
    )
    .eq("recorrente", true)
    .order("vigente_desde", { referencedTable: "conta_valores", ascending: false })
    .order("competencia", { referencedTable: "lancamentos", ascending: false })
    .limit(1, { referencedTable: "lancamentos" })
    .order("nome")
    .returns<ContaBanco[]>();

  const contas: ContaView[] = (data ?? []).map(({ conta_valores, lancamentos, ...c }) => {
    // Valor vigente hoje; se só houver reajuste futuro, usa o mais antigo
    const vigente =
      conta_valores.find((v) => v.vigente_desde <= hoje) ?? conta_valores.at(-1);
    // Apartamento: o valor real é o último juros de obra, não a estimativa
    const valorAtual =
      c.origem_valor === "juros_obra" && ultimoJuros
        ? Number(ultimoJuros.valor)
        : vigente
          ? Number(vigente.valor)
          : 0;
    return {
      ...c,
      valor_atual: valorAtual,
      historico: conta_valores.map((v) => ({ valor: Number(v.valor), desde: v.vigente_desde })),
      ultima_parcela: lancamentos[0]?.parcela ?? null,
      ultimo_pago: lancamentos[0]?.valor_pago ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Recorrentes</h1>
      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}
      <RecorrentesLista contas={contas} mes={mesAtual()} />
    </div>
  );
}
