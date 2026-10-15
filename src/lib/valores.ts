// "1.234,56" ou "1234.56" -> 1234.56 · vazio -> null · inválido -> NaN
export function lerValor(texto: FormDataEntryValue | null): number | null {
  const bruto = String(texto ?? "").trim();
  if (!bruto) return null;
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : bruto;
  const n = Number(normalizado);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

// Data de hoje (AAAA-MM-DD) no fuso de Brasília
export function hoje() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function valorParaInput(v: number | null) {
  return v === null ? "" : Number(v).toFixed(2).replace(".", ",");
}
