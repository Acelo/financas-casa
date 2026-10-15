"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData } from "@/lib/format";
import { hoje, lerValor } from "@/lib/valores";

export type Resultado = { erro?: string; ok?: string };

export async function salvarLancamento(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "pago" ? "pago" : "pendente";
  const valorPrevisto = lerValor(formData.get("valor_previsto"));
  const valorPago = lerValor(formData.get("valor_pago"));
  const dataPagamento = String(formData.get("data_pagamento") ?? "") || null;
  const obs = String(formData.get("obs") ?? "").trim() || null;

  if (Number.isNaN(valorPrevisto) || Number.isNaN(valorPago)) {
    return { erro: "Valor inválido." };
  }
  if (valorPrevisto === null) {
    return { erro: "Informe o valor previsto." };
  }

  const pago = status === "pago";
  const supabase = await createClient();
  const { error } = await supabase
    .from("lancamentos")
    .update({
      status,
      valor_previsto: valorPrevisto,
      valor_pago: pago ? (valorPago ?? valorPrevisto) : null,
      data_pagamento: pago ? (dataPagamento ?? hoje()) : null,
      obs,
    })
    .eq("id", id);

  if (error) return { erro: error.message };
  refresh();
  return { ok: "Salvo." };
}

export async function marcarPago(id: string) {
  const supabase = await createClient();
  const { data: atual, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("valor_previsto")
    .eq("id", id)
    .single();
  if (erroLeitura) return { erro: erroLeitura.message };

  const { error } = await supabase
    .from("lancamentos")
    .update({
      status: "pago",
      valor_pago: atual.valor_previsto,
      data_pagamento: hoje(),
    })
    .eq("id", id);

  if (error) return { erro: error.message };
  refresh();
  return {};
}

export async function excluirLancamento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { erro: error.message };
  refresh();
  return {};
}

export async function gerarMes(mes: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gerar_lancamentos", {
    p_competencia: competenciaParaData(mes),
  });
  if (error) return { erro: error.message };
  refresh();
  return {
    ok: data ? `${data} conta(s) adicionada(s).` : "Todas as contas do mês já estavam lançadas.",
  };
}

// Gasto avulso (ex.: dentista): reaproveita a conta se o nome já existir
export async function adicionarAvulso(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const mes = String(formData.get("mes") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || "Outros";
  const valor = lerValor(formData.get("valor"));
  const pago = formData.get("pago") === "on";

  if (!nome) return { erro: "Informe a descrição." };
  if (valor === null || Number.isNaN(valor)) return { erro: "Valor inválido." };

  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("contas")
    .select("id")
    .ilike("nome", nome.replace(/[\\%_]/g, (c) => `\\${c}`))
    .maybeSingle();

  let contaId = existente?.id as string | undefined;
  if (!contaId) {
    const { data: nova, error } = await supabase
      .from("contas")
      .insert({ nome, categoria, recorrente: false })
      .select("id")
      .single();
    if (error) return { erro: error.message };
    contaId = nova.id;
  }

  const { error } = await supabase.from("lancamentos").insert({
    conta_id: contaId,
    competencia: competenciaParaData(mes),
    valor_previsto: valor,
    valor_pago: pago ? valor : null,
    data_pagamento: pago ? hoje() : null,
    status: pago ? "pago" : "pendente",
  });

  if (error) {
    return {
      erro: error.code === "23505"
        ? "Essa conta já está lançada neste mês."
        : error.message,
    };
  }
  refresh();
  return { ok: "Adicionado." };
}
