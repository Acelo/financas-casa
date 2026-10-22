"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, mesAtual } from "@/lib/format";
import { lerValor } from "@/lib/valores";
import type { Resultado } from "../actions";

function lerInteiro(texto: FormDataEntryValue | null) {
  const n = Number(String(texto ?? "").trim());
  return String(texto ?? "").trim() && Number.isInteger(n) && n > 0 ? n : null;
}

// Cria (sem id) ou atualiza (com id) o cadastro de uma conta
export async function salvarConta(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const dia = lerInteiro(formData.get("dia_vencimento"));

  if (!nome) return { erro: "Informe o nome." };
  if (!categoria) return { erro: "Informe a categoria." };
  if (dia !== null && dia > 31) return { erro: "Dia de vencimento inválido." };

  const dados = {
    nome,
    categoria,
    dia_vencimento: dia,
    forma_pagamento: String(formData.get("forma_pagamento") ?? "").trim() || null,
    tipo_valor: formData.get("variavel") === "on" ? "variavel" : "fixo",
    gera_lancamento: formData.get("gera_lancamento") === "on",
    ativo: formData.get("ativo") === "on",
    parcelas_totais: lerInteiro(formData.get("parcelas_totais")),
    obs: String(formData.get("obs") ?? "").trim() || null,
  };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("contas").update(dados).eq("id", id);
    if (error) return { erro: traduzir(error) };
  } else {
    const valor = lerValor(formData.get("valor"));
    if (valor === null || Number.isNaN(valor)) return { erro: "Informe o valor." };

    const { data: nova, error } = await supabase
      .from("contas")
      .insert(dados)
      .select("id")
      .single();
    if (error) return { erro: traduzir(error) };

    const { error: e2 } = await supabase.from("conta_valores").insert({
      conta_id: nova.id,
      valor,
      vigente_desde: competenciaParaData(mesAtual()),
    });
    if (e2) return { erro: e2.message };
  }

  refresh();
  return { ok: "Salvo." };
}

// Reajuste: novo valor a partir de um mês. Atualiza também os lançamentos
// pendentes desse mês em diante, para o previsto já refletir o reajuste.
export async function reajustarValor(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const contaId = String(formData.get("conta_id") ?? "");
  const mes = String(formData.get("mes") ?? "");
  const valor = lerValor(formData.get("valor"));

  if (!/^\d{4}-\d{2}$/.test(mes)) return { erro: "Informe o mês." };
  if (valor === null || Number.isNaN(valor)) return { erro: "Valor inválido." };

  const supabase = await createClient();
  const competencia = competenciaParaData(mes);

  const { error } = await supabase
    .from("conta_valores")
    .upsert(
      { conta_id: contaId, valor, vigente_desde: competencia },
      { onConflict: "conta_id,vigente_desde" },
    );
  if (error) return { erro: error.message };

  const { error: e2 } = await supabase
    .from("lancamentos")
    .update({ valor_previsto: valor })
    .eq("conta_id", contaId)
    .eq("status", "pendente")
    .gte("competencia", competencia);
  if (e2) return { erro: e2.message };

  refresh();
  return { ok: "Reajuste registrado." };
}

export async function alternarAtivo(id: string, ativo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("contas").update({ ativo }).eq("id", id);
  if (error) return { erro: error.message };
  refresh();
  return {};
}

function traduzir(error: { code?: string; message: string }) {
  return error.code === "23505" ? "Já existe uma conta com esse nome." : error.message;
}
