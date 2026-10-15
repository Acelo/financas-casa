"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData } from "@/lib/format";
import { lerValor } from "@/lib/valores";
import type { Resultado } from "../actions";

// Lança ou corrige o juros de um mês (a competência é a chave)
export async function salvarJuros(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const mes = String(formData.get("mes") ?? "");
  const original = String(formData.get("original") ?? "");
  const valor = lerValor(formData.get("valor"));
  const dataPagamento = String(formData.get("data_pagamento") ?? "") || null;
  const obs = String(formData.get("obs") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}$/.test(mes)) return { erro: "Informe o mês." };
  if (valor === null || Number.isNaN(valor)) return { erro: "Valor inválido." };

  const supabase = await createClient();
  const competencia = competenciaParaData(mes);

  // Trocou o mês de um registro existente: remove o antigo
  if (original && original !== competencia) {
    const { error } = await supabase.from("juros_obra").delete().eq("competencia", original);
    if (error) return { erro: error.message };
  }

  const { error } = await supabase
    .from("juros_obra")
    .upsert(
      { competencia, valor, data_pagamento: dataPagamento, obs },
      { onConflict: "competencia" },
    );
  if (error) return { erro: error.message };

  refresh();
  return { ok: "Salvo." };
}

export async function excluirJuros(competencia: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("juros_obra").delete().eq("competencia", competencia);
  if (error) return { erro: error.message };
  refresh();
  return {};
}
