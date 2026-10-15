"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saldoRegistrado, type Movimento } from "@/lib/reservas";
import { hoje, lerValor } from "@/lib/valores";
import type { Resultado } from "../actions";

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

function lerData(texto: FormDataEntryValue | null) {
  const s = String(texto ?? "");
  return DATA_RE.test(s) ? s : hoje();
}

// Saldo líquido opcional (o que o banco mostra depois de IR/IOF)
function lerLiquido(texto: FormDataEntryValue | null, bruto: number) {
  const v = lerValor(texto);
  if (v === null) return { valor: null };
  if (Number.isNaN(v)) return { erro: "Saldo líquido inválido." };
  if (v > bruto) return { erro: "O líquido não pode ser maior que o bruto." };
  return { valor: v };
}

// Cria (sem id, com saldo inicial) ou edita uma caixinha
export async function salvarReserva(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const indexador = String(formData.get("indexador") ?? "cdi");
  const taxa = lerValor(formData.get("taxa"));

  if (!nome) return { erro: "Informe o nome da caixinha." };
  if (!["cdi", "prefixado", "nenhum"].includes(indexador)) return { erro: "Rendimento inválido." };
  if (indexador !== "nenhum" && (taxa === null || Number.isNaN(taxa))) {
    return { erro: "Informe a taxa (ex.: 120 para 120% do CDI)." };
  }

  const dados = {
    nome,
    indexador,
    taxa: indexador === "nenhum" ? null : taxa,
    obs: String(formData.get("obs") ?? "").trim() || null,
    ativo: id ? formData.get("ativo") === "on" : true,
  };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("reservas").update(dados).eq("id", id);
    if (error) return { erro: traduzir(error) };
  } else {
    const saldo = lerValor(formData.get("saldo_inicial"));
    if (saldo === null || Number.isNaN(saldo) || saldo <= 0) {
      return { erro: "Informe o saldo atual da caixinha." };
    }
    const liquido = lerLiquido(formData.get("saldo_liquido"), saldo);
    if (liquido.erro) return { erro: liquido.erro };

    const { data: nova, error } = await supabase.from("reservas").insert(dados).select("id").single();
    if (error) return { erro: traduzir(error) };

    const { error: e2 } = await supabase.from("reserva_movimentos").insert({
      reserva_id: nova.id,
      tipo: "saldo_inicial",
      valor: saldo,
      data: lerData(formData.get("data")),
      descricao: "Saldo inicial",
      valor_liquido: liquido.valor,
    });
    if (e2) return { erro: e2.message };
  }

  refresh();
  return { ok: "Salvo." };
}

// Aporte ou resgate (cria sem id, edita com id)
export async function salvarMovimento(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("id") ?? "");
  const reservaId = String(formData.get("reserva_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const valor = lerValor(formData.get("valor"));

  if (!["aporte", "resgate", "saldo_inicial", "rendimento"].includes(tipo)) {
    return { erro: "Tipo inválido." };
  }
  if (valor === null || Number.isNaN(valor) || valor === 0) return { erro: "Informe o valor." };

  const liquido = tipo === "saldo_inicial" ? lerLiquido(formData.get("saldo_liquido"), valor) : { valor: null };
  if (liquido.erro) return { erro: liquido.erro };

  const dados = {
    tipo,
    valor,
    data: lerData(formData.get("data")),
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    ...(tipo === "saldo_inicial" ? { valor_liquido: liquido.valor } : {}),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("reserva_movimentos").update(dados).eq("id", id)
    : await supabase.from("reserva_movimentos").insert({ ...dados, reserva_id: reservaId });

  if (error) return { erro: error.message };
  refresh();
  return { ok: "Salvo." };
}

// Informa o saldo real (o que aparece no banco) e lança a diferença como rendimento
export async function atualizarSaldo(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const reservaId = String(formData.get("reserva_id") ?? "");
  const real = lerValor(formData.get("saldo_real"));
  const data = lerData(formData.get("data"));

  if (real === null || Number.isNaN(real)) return { erro: "Informe o saldo bruto que aparece no banco." };
  const liquido = lerLiquido(formData.get("saldo_liquido"), real);
  if (liquido.erro) return { erro: liquido.erro };

  const supabase = await createClient();
  const { data: movs, error } = await supabase
    .from("reserva_movimentos")
    .select("id, reserva_id, data, tipo, valor, descricao, valor_liquido")
    .eq("reserva_id", reservaId)
    .returns<Movimento[]>();
  if (error) return { erro: error.message };

  const diferenca = Math.round((real - saldoRegistrado(movs ?? [], data)) * 100) / 100;
  if (Math.abs(diferenca) < 0.01) {
    // Bruto já confere: só guarda o líquido informado na última âncora
    if (liquido.valor === null) return { ok: "O saldo já confere com o registrado." };
    const ancora = (movs ?? [])
      .filter((m) => (m.tipo === "saldo_inicial" || m.tipo === "rendimento") && m.data <= data)
      .sort((a, b) => a.data.localeCompare(b.data))
      .at(-1);
    if (!ancora) return { erro: "Caixinha sem saldo inicial." };
    const { error: e3 } = await supabase
      .from("reserva_movimentos")
      .update({ valor_liquido: liquido.valor })
      .eq("id", ancora.id);
    if (e3) return { erro: e3.message };
    refresh();
    return { ok: "Bruto já conferia; saldo líquido atualizado." };
  }

  const { error: e2 } = await supabase.from("reserva_movimentos").insert({
    reserva_id: reservaId,
    tipo: "rendimento",
    valor: diferenca,
    data,
    descricao: "Atualização de saldo",
    valor_liquido: liquido.valor,
  });
  if (e2) return { erro: e2.message };

  refresh();
  return {
    ok: `Rendimento de ${diferenca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} lançado.`,
  };
}

export async function excluirMovimento(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reserva_movimentos").delete().eq("id", id);
  if (error) return { erro: error.message };
  refresh();
  return {};
}

function traduzir(error: { code?: string; message: string }) {
  return error.code === "23505" ? "Já existe uma caixinha com esse nome." : error.message;
}
