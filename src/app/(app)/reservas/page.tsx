import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import {
  buscarCDI,
  estimar,
  saldoRegistrado,
  type Indexador,
  type Movimento,
} from "@/lib/reservas";
import { hoje as hojeBR, lerValor } from "@/lib/valores";
import { Resumo } from "../_components/mes-nav";
import { ReservasLista, type ReservaView } from "./reservas-lista";

type ReservaBanco = {
  id: string;
  nome: string;
  indexador: Indexador;
  taxa: number | null;
  ativo: boolean;
  obs: string | null;
};

export default async function Reservas({ searchParams }: PageProps<"/reservas">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const hoje = hojeBR();
  const ano = hoje.slice(0, 4);

  const [resRes, movRes] = await Promise.all([
    supabase.from("reservas").select("id, nome, indexador, taxa, ativo, obs").order("nome").returns<ReservaBanco[]>(),
    supabase
      .from("reserva_movimentos")
      .select("id, reserva_id, data, tipo, valor, descricao")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Movimento[]>(),
  ]);
  const erro = resRes.error ?? movRes.error;
  const movs = movRes.data ?? [];

  // CDI desde a âncora mais antiga entre as caixinhas que rendem
  const ancoras = movs
    .filter((m) => m.tipo === "saldo_inicial" || m.tipo === "rendimento")
    .reduce<Record<string, string>>((acc, m) => {
      if (!acc[m.reserva_id] || m.data > acc[m.reserva_id]) acc[m.reserva_id] = m.data;
      return acc;
    }, {});
  const desde = Object.values(ancoras).sort()[0];
  const cdi = desde ? await buscarCDI(desde) : null;

  const reservas: ReservaView[] = (resRes.data ?? []).map((r) => {
    const doRes = movs.filter((m) => m.reserva_id === r.id);
    return {
      ...r,
      movimentos: doRes,
      registrado: saldoRegistrado(doRes, hoje),
      estimativa: r.ativo ? estimar(r.indexador, r.taxa, doRes, cdi, hoje) : null,
    };
  });

  const ativas = reservas.filter((r) => r.ativo);
  const totalRegistrado = ativas.reduce((s, r) => s + r.registrado, 0);
  const totalEstimado = ativas.reduce((s, r) => s + (r.estimativa?.estimado ?? r.registrado), 0);
  const doAno = movs.filter((m) => m.data.startsWith(ano));
  const soma = (tipo: Movimento["tipo"]) =>
    doAno.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.valor), 0);
  const rendimentoAno = soma("rendimento") + ativas.reduce((s, r) => s + (r.estimativa?.rendimento ?? 0), 0);

  // Vindo de Receitas ("guardar a sobra"): abre o aporte já preenchido
  const aporteSugerido = typeof sp.aporte === "string" ? lerValor(sp.aporte) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Reservas</h1>

      {erro && (
        <p className="rounded-lg border border-negative/40 p-3 text-sm text-negative">
          Erro ao carregar: {erro.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo titulo="Saldo estimado hoje" valor={formatBRL(totalEstimado)} />
        <Resumo titulo="Saldo registrado" valor={formatBRL(totalRegistrado)} />
        <Resumo titulo={`Rendimento em ${ano}`} valor={formatBRL(rendimentoAno)} cor="positivo" />
        <Resumo titulo={`Aportes − resgates em ${ano}`} valor={formatBRL(soma("aporte") - soma("resgate"))} />
      </div>

      {desde && !cdi && (
        <p className="text-sm text-muted">
          Não foi possível consultar o CDI no Banco Central agora; mostrando só o saldo registrado.
        </p>
      )}

      <ReservasLista
        reservas={reservas}
        hoje={hoje}
        aporteSugerido={aporteSugerido && !Number.isNaN(aporteSugerido) ? aporteSugerido : null}
      />
    </div>
  );
}
