"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData } from "@/lib/format";
import { hoje, lerValor } from "@/lib/valores";
import { vencimentoPadrao } from "@/lib/vencimento";

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
  // Só vem no formulário de contas parceladas
  const temParcela = formData.has("parcela");
  const parcelaTexto = String(formData.get("parcela") ?? "").trim();
  const parcela = parcelaTexto ? Number(parcelaTexto) : null;
  // Dia do vencimento (1 a 31); vazio = conta sem dia
  const diaTexto = String(formData.get("dia_vencimento") ?? "").trim();
  const diaInformado = diaTexto ? Number(diaTexto) : null;
  const vencimentoProximos = formData.get("vencimento_proximos") === "on";

  if (diaInformado !== null && (!Number.isInteger(diaInformado) || diaInformado < 1 || diaInformado > 31)) {
    return { erro: "Dia do vencimento deve ser de 1 a 31." };
  }
  if (temParcela && parcela !== null && (!Number.isInteger(parcela) || parcela < 1)) {
    return { erro: "Número da parcela inválido." };
  }
  if (Number.isNaN(valorPrevisto) || Number.isNaN(valorPago)) {
    return { erro: "Valor inválido." };
  }
  if (valorPrevisto === null) {
    return { erro: "Informe o valor previsto." };
  }

  const pago = status === "pago";
  const supabase = await createClient();

  // Vencimento: igual ao do cadastro -> não guarda nada (segue o cadastro).
  // "Próximos meses" -> muda o dia no cadastro da conta.
  const { data: atual, error: erroLeitura } = await supabase
    .from("lancamentos")
    .select("competencia, conta_id, valor_previsto, valor_pago, valor_conferido, contas!inner(dia_vencimento, tipo_valor, origem_valor)")
    .eq("id", id)
    .single<{
      competencia: string;
      conta_id: string;
      valor_previsto: number;
      valor_pago: number | null;
      valor_conferido: boolean;
      contas: { dia_vencimento: number | null; tipo_valor: string; origem_valor: string };
    }>();
  if (erroLeitura) return { erro: erroLeitura.message };

  // Checkbox "Valor variável" (só existe no formulário de contas manuais):
  // muda o cadastro, vale para os próximos meses gerados
  if (atual.contas.origem_valor === "manual") {
    const tipo = formData.get("variavel") === "on" ? "variavel" : "fixo";
    if (tipo !== atual.contas.tipo_valor) {
      const { error: e3 } = await supabase.from("contas").update({ tipo_valor: tipo }).eq("id", atual.conta_id);
      if (e3) return { erro: e3.message };
    }
  }

  // Lembrete "valor ainda não editado" some quando o valor muda, quando a
  // conta é paga ou quando o valor é confirmado como está
  const valorMudou =
    Number(atual.valor_previsto) !== valorPrevisto ||
    (pago && valorPago !== null && Number(atual.valor_pago ?? NaN) !== valorPago);
  const conferido =
    atual.valor_conferido || valorMudou || pago || formData.get("confirmar_valor") === "on";

  let diaCadastro = atual.contas.dia_vencimento;
  if (vencimentoProximos && diaInformado !== diaCadastro) {
    diaCadastro = diaInformado;
    const { error: e2 } = await supabase
      .from("contas")
      .update({ dia_vencimento: diaCadastro })
      .eq("id", atual.conta_id);
    if (e2) return { erro: e2.message };
  }
  // Mesmo dia do cadastro: não guarda nada (o mês segue o cadastro)
  const vencimento =
    diaInformado !== null && diaInformado !== diaCadastro
      ? vencimentoPadrao(atual.competencia, diaInformado)
      : null;

  const { data: gravado, error } = await supabase
    .from("lancamentos")
    .update({
      status,
      valor_previsto: valorPrevisto,
      valor_pago: pago ? (valorPago ?? valorPrevisto) : null,
      data_pagamento: pago ? (dataPagamento ?? hoje()) : null,
      obs,
      vencimento,
      valor_conferido: conferido,
      ...(temParcela ? { parcela } : {}),
    })
    .eq("id", id)
    .select("vencimento")
    .maybeSingle();

  if (error) return { erro: error.message };
  // Confere que a linha foi mesmo gravada (sem isso, uma falha silenciosa
  // parecia "salvo" e a tela voltava ao valor antigo)
  if (!gravado || (gravado.vencimento ?? null) !== vencimento) {
    return { erro: "Não foi possível salvar. Atualize a página e tente de novo." };
  }
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
      // Pagou: a conta chegou e o valor foi aceito
      valor_conferido: true,
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

export async function excluirLancamentos(ids: string[]): Promise<Resultado> {
  if (!ids.length) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").delete().in("id", ids);
  if (error) return { erro: error.message };
  refresh();
  return { ok: `${ids.length} conta(s) removida(s) do mês.` };
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
