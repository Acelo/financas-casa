import { createClient } from "@/lib/supabase/server";
import { formatBRL, mesAtual, somarMeses } from "@/lib/format";
import { Resumo } from "../_components/mes-nav";
import { JurosLista, type JurosView } from "./juros-lista";

export async function JurosObra() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_juros_obra")
    .select("competencia, valor, data_pagamento, obs, variacao, variacao_pct")
    .order("competencia", { ascending: false })
    .returns<JurosView[]>();

  const registros = data ?? [];
  const total = registros.reduce((s, r) => s + Number(r.valor), 0);
  const ultimo = registros[0];
  const media = registros.length ? total / registros.length : 0;
  const primeiro = registros.at(-1);
  const acumulado =
    ultimo && primeiro && Number(primeiro.valor) > 0
      ? ((Number(ultimo.valor) - Number(primeiro.valor)) / Number(primeiro.valor)) * 100
      : null;

  // Sugere o mês seguinte ao último lançado
  const proximoMes = ultimo ? somarMeses(ultimo.competencia.slice(0, 7), 1) : mesAtual();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Juros de obra</h1>

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resumo titulo="Último mês" valor={formatBRL(ultimo?.valor ?? 0)} />
        <Resumo titulo="Média mensal" valor={formatBRL(media)} />
        <Resumo titulo="Total pago" valor={formatBRL(total)} />
        <Resumo
          titulo="Variação desde o início"
          valor={acumulado === null ? "-" : `${acumulado > 0 ? "+" : ""}${acumulado.toFixed(1).replace(".", ",")}%`}
          cor={acumulado === null ? undefined : acumulado > 0 ? "negativo" : "positivo"}
        />
      </div>

      <p className="text-sm text-muted">
        O valor de cada mês vai automaticamente para a conta &quot;Apartamento&quot; em Contas do mês.
      </p>

      <JurosLista registros={registros} proximoMes={proximoMes} />
    </div>
  );
}
