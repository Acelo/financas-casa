import { createClient } from "@/lib/supabase/server";
import { BotaoBackup } from "./botao-backup";

type Backup = {
  id: string;
  tipo: "manual" | "automatico";
  arquivo: string | null;
  tamanho_bytes: number | null;
  criado_por: string | null;
  criado_em: string;
};

// Automático roda todo domingo; passou disso com folga, algo falhou
const ALERTA_DIAS = 8;

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Página renderizada no servidor a cada requisição: "agora" é o da requisição
function diasDesde(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function tamanho(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`
    : `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export default async function BackupPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("backups")
    .select("id, tipo, arquivo, tamanho_bytes, criado_por, criado_em")
    .order("criado_em", { ascending: false })
    .limit(20)
    .returns<Backup[]>();

  const backups = data ?? [];
  const ultimoAuto = backups.find((b) => b.tipo === "automatico");
  const ultimoManual = backups.find((b) => b.tipo === "manual");
  const diasAuto = ultimoAuto ? diasDesde(ultimoAuto.criado_em) : null;
  const autoAtrasado = diasAuto === null || diasAuto > ALERTA_DIAS;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Backup</h1>

      {error && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {error.message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Último backup automático (semanal)</p>
          <p className="text-lg font-semibold">
            {ultimoAuto ? dataHora(ultimoAuto.criado_em) : "Nenhum ainda"}
          </p>
          {autoAtrasado && (
            <p className="mt-1 text-sm text-negative">
              ⚠ {ultimoAuto ? `Há mais de ${ALERTA_DIAS} dias sem backup automático.` : "O backup automático ainda não rodou."}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Roda todo domingo às 3h e fica guardado no GitHub, no ramo &quot;backups&quot; do repositório.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Último backup manual</p>
          <p className="text-lg font-semibold">
            {ultimoManual ? dataHora(ultimoManual.criado_em) : "Nenhum ainda"}
          </p>
          <p className="mb-3 mt-2 text-xs text-muted">
            Baixa um arquivo com todos os dados. Guarde no OneDrive ou em outro lugar seguro.
          </p>
          <BotaoBackup />
        </div>
      </div>

      {backups.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 font-medium">Histórico</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{dataHora(b.criado_em)}</p>
                  <p className="truncate text-xs text-muted">
                    {b.tipo === "automatico" ? "Automático" : `Manual${b.criado_por ? ` · ${b.criado_por}` : ""}`}
                    {b.arquivo && ` · ${b.arquivo}`}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-muted">{tamanho(b.tamanho_bytes)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
