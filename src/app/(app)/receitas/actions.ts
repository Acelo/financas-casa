"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { competenciaParaData, somarMeses } from "@/lib/format";
import { lerValor } from "@/lib/valores";
import type { Resultado } from "../actions";

// Cria (sem id) ou atualiza (com id) uma receita
export async function salvarReceita(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("id") ?? "");
  const mes = String(formData.get("mes") ?? "");
  const pessoa = String(formData.get("pessoa") ?? "").trim();
  const tipo = formData.get("tipo") === "extra" ? "extra" : "salario";
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const valor = lerValor(formData.get("valor"));

  if (!pessoa) return { erro: "Informe a pessoa." };
  if (valor === null || Number.isNaN(valor)) return { erro: "Valor inválido." };

  const supabase = await createClient();
  const dados = { pessoa, tipo, descricao, valor };
  const { error } = id
    ? await supabase.from("receitas").update(dados).eq("id", id)
    : await supabase
        .from("receitas")
        .insert({ ...dados, competencia: competenciaParaData(mes) });

  if (error) return { erro: error.message };
  refresh();
  return { ok: "Salvo." };
}

export async function excluirReceita(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("receitas").delete().eq("id", id);
  if (error) return { erro: error.message };
  refresh();
  return {};
}

// Traz os salários do mês anterior como ponto de partida (cada um ajusta depois)
export async function copiarSalarios(mes: string): Promise<Resultado> {
  const supabase = await createClient();

  const [{ data: anteriores, error: e1 }, { data: atuais, error: e2 }] =
    await Promise.all([
      supabase
        .from("receitas")
        .select("pessoa, descricao, valor")
        .eq("competencia", competenciaParaData(somarMeses(mes, -1)))
        .eq("tipo", "salario"),
      supabase
        .from("receitas")
        .select("pessoa")
        .eq("competencia", competenciaParaData(mes))
        .eq("tipo", "salario"),
    ]);
  if (e1 || e2) return { erro: (e1 ?? e2)!.message };

  const jaTem = new Set((atuais ?? []).map((r) => r.pessoa));
  const novos = (anteriores ?? [])
    .filter((r) => !jaTem.has(r.pessoa))
    .map((r) => ({
      ...r,
      tipo: "salario",
      competencia: competenciaParaData(mes),
    }));

  if (!anteriores?.length) {
    return { erro: "O mês anterior não tem salários lançados." };
  }
  if (!novos.length) {
    return { ok: "Os salários deste mês já estão lançados." };
  }

  const { error } = await supabase.from("receitas").insert(novos);
  if (error) return { erro: error.message };
  refresh();
  return { ok: `${novos.length} salário(s) copiado(s). Ajuste os valores se mudou algo.` };
}
