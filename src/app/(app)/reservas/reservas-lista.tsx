"use client";

import { useActionState, useState, useTransition } from "react";
import { formatBRL } from "@/lib/format";
import {
  comSinal,
  descreverTaxa,
  type Estimativa,
  type Indexador,
  type Movimento,
} from "@/lib/reservas";
import { valorParaInput } from "@/lib/valores";
import type { Resultado } from "../actions";
import { CampoValor } from "../_components/campo-valor";
import {
  atualizarSaldo,
  excluirMovimento,
  salvarMovimento,
  salvarReserva,
} from "./actions";

export type ReservaView = {
  id: string;
  nome: string;
  indexador: Indexador;
  taxa: number | null;
  ativo: boolean;
  obs: string | null;
  movimentos: Movimento[]; // mais recentes primeiro
  registrado: number;
  estimativa: Estimativa | null;
};

const campo =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent";

const ROTULO: Record<Movimento["tipo"], string> = {
  saldo_inicial: "Saldo inicial",
  aporte: "Aporte",
  resgate: "Resgate",
  rendimento: "Rendimento",
};

function dataBR(iso: string) {
  return iso.split("-").reverse().join("/");
}

export function ReservasLista({
  reservas,
  hoje,
  aporteSugerido,
}: {
  reservas: ReservaView[];
  hoje: string;
  aporteSugerido: number | null;
}) {
  const [nova, setNova] = useState(reservas.length === 0);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const ativas = reservas.filter((r) => r.ativo);
  const arquivadas = reservas.filter((r) => !r.ativo);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setNova((n) => !n)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent"
      >
        + Nova caixinha
      </button>

      {nova && (
        <div className="rounded-xl vidro p-4">
          <FormReserva hoje={hoje} aoTerminar={() => setNova(false)} />
        </div>
      )}

      {reservas.length === 0 && !nova && (
        <p className="text-sm text-muted">Nenhuma caixinha cadastrada.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {ativas.map((r, i) => (
          <CartaoReserva
            key={r.id}
            r={r}
            hoje={hoje}
            aporteInicial={i === 0 ? aporteSugerido : null}
          />
        ))}
      </div>

      {arquivadas.length > 0 && (
        <div className="space-y-3">
          <button type="button" onClick={() => setVerArquivadas((v) => !v)} className="text-sm text-muted">
            {verArquivadas ? "Ocultar" : "Ver"} caixinhas arquivadas ({arquivadas.length})
          </button>
          {verArquivadas && (
            <div className="grid gap-4 lg:grid-cols-2">
              {arquivadas.map((r) => (
                <CartaoReserva key={r.id} r={r} hoje={hoje} aporteInicial={null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Painel = "aporte" | "resgate" | "atualizar" | "editar" | null;

function CartaoReserva({
  r,
  hoje,
  aporteInicial,
}: {
  r: ReservaView;
  hoje: string;
  aporteInicial: number | null;
}) {
  const [painel, setPainel] = useState<Painel>(aporteInicial ? "aporte" : null);
  const [todos, setTodos] = useState(false);
  const e = r.estimativa;
  const visiveis = todos ? r.movimentos : r.movimentos.slice(0, 5);

  const botao = (p: Exclude<Painel, null>, rotulo: string) => (
    <button
      type="button"
      onClick={() => setPainel((atual) => (atual === p ? null : p))}
      className={`rounded-lg border px-3 py-1.5 text-sm ${painel === p ? "border-accent text-accent" : "border-border"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <section className={`space-y-4 rounded-xl vidro p-4 ${r.ativo ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{r.nome}</h2>
          <p className="text-xs text-muted">{descreverTaxa(r.indexador, r.taxa)}{!r.ativo && " · arquivada"}</p>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap text-xl font-semibold">{formatBRL(e?.estimado ?? r.registrado)}</p>
          <p className="text-xs text-muted">{e ? "bruto estimado hoje" : "saldo"}</p>
          {e && (
            <p className="mt-1 whitespace-nowrap text-sm">
              <span className="font-medium">{formatBRL(e.liquido)}</span>{" "}
              <span className="text-xs text-muted">líquido</span>
            </p>
          )}
        </div>
      </div>

      {e && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted">
          Registrado {formatBRL(r.registrado)} ·{" "}
          <span className="text-positive">
            {e.rendimento >= 0 ? "+" : ""}
            {formatBRL(e.rendimento)}
          </span>{" "}
          de rendimento estimado desde {dataBR(e.desde)}
          {e.taxaAte && ` (CDI até ${dataBR(e.taxaAte)})`}. Se resgatasse tudo hoje: IR/IOF de{" "}
          {formatBRL(e.impostos)}, líquido de {formatBRL(e.liquido)}.
          {!e.baseInformada && " Informe o saldo líquido ao atualizar o saldo para o cálculo ficar mais preciso."}
        </p>
      )}

      {r.ativo && (
        <div className="flex flex-wrap gap-2">
          {botao("aporte", "+ Aporte")}
          {botao("resgate", "− Resgate")}
          {r.indexador !== "nenhum" && botao("atualizar", "Atualizar saldo")}
          {botao("editar", "Editar")}
        </div>
      )}
      {!r.ativo && <div className="flex gap-2">{botao("editar", "Editar")}</div>}

      {(painel === "aporte" || painel === "resgate") && (
        <FormMovimento
          key={painel}
          reservaId={r.id}
          tipo={painel}
          hoje={hoje}
          valorInicial={painel === "aporte" ? aporteInicial : null}
          aoTerminar={() => setPainel(null)}
        />
      )}
      {painel === "atualizar" && (
        <FormAtualizar r={r} hoje={hoje} aoTerminar={() => setPainel(null)} />
      )}
      {painel === "editar" && <FormReserva reserva={r} hoje={hoje} aoTerminar={() => setPainel(null)} />}

      {r.movimentos.length > 0 && (
        <div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {visiveis.map((m) => (
              <ItemMovimento key={m.id} m={m} hoje={hoje} />
            ))}
          </ul>
          {r.movimentos.length > 5 && (
            <button type="button" onClick={() => setTodos((t) => !t)} className="mt-2 text-sm text-muted">
              {todos ? "Mostrar menos" : `Ver todas (${r.movimentos.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ItemMovimento({ m, hoje }: { m: Movimento; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [excluindo, startTransition] = useTransition();
  const valor = comSinal(m);

  return (
    <li className={excluindo ? "opacity-50" : ""}>
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm">
        <span className="w-20 shrink-0 tabular-nums text-muted">{dataBR(m.data)}</span>
        <span className="min-w-0 flex-1 truncate">
          {ROTULO[m.tipo]}
          {m.descricao && m.descricao !== ROTULO[m.tipo] && <span className="text-muted"> · {m.descricao}</span>}
        </span>
        <span className={`whitespace-nowrap font-medium tabular-nums ${valor < 0 ? "text-negative" : "text-positive"}`}>
          {valor < 0 ? "−" : "+"}
          {formatBRL(Math.abs(valor))}
        </span>
      </button>
      {aberto && (
        <div className="border-t border-border bg-background/60 p-3">
          {m.tipo === "rendimento" ? (
            <p className="mb-2 text-xs text-muted">
              Rendimentos vêm de &quot;Atualizar saldo&quot;. Para corrigir, exclua e atualize o saldo de novo.
            </p>
          ) : (
            <FormMovimento
              reservaId={m.reserva_id}
              tipo={m.tipo}
              hoje={hoje}
              movimento={m}
              aoTerminar={() => setAberto(false)}
            />
          )}
          <button
            type="button"
            disabled={excluindo}
            onClick={() => {
              if (confirm(`Excluir este ${ROTULO[m.tipo].toLowerCase()}?`)) {
                startTransition(async () => { await excluirMovimento(m.id); });
              }
            }}
            className="mt-2 text-sm text-negative hover:underline"
          >
            Excluir movimentação
          </button>
        </div>
      )}
    </li>
  );
}

function useFormulario(
  acao: (prev: Resultado, fd: FormData) => Promise<Resultado>,
  aoTerminar: () => void,
  fecharAoSalvar = true,
) {
  return useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await acao(prev, fd);
    if (r.ok && fecharAoSalvar) aoTerminar();
    return r;
  }, {});
}

function Acoes({ salvando, aoCancelar, rotulo = "Salvar" }: { salvando: boolean; aoCancelar: () => void; rotulo?: string }) {
  return (
    <div className="flex gap-2 sm:col-span-full">
      <button type="submit" disabled={salvando} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
        {salvando ? "Salvando..." : rotulo}
      </button>
      <button type="button" onClick={aoCancelar} className="rounded-lg border border-border px-4 py-2 text-sm">
        Cancelar
      </button>
    </div>
  );
}

function FormMovimento({
  reservaId,
  tipo,
  hoje,
  movimento,
  valorInicial,
  aoTerminar,
}: {
  reservaId: string;
  tipo: Movimento["tipo"];
  hoje: string;
  movimento?: Movimento;
  valorInicial?: number | null;
  aoTerminar: () => void;
}) {
  const [state, action, salvando] = useFormulario(salvarMovimento, aoTerminar);
  const valorPadrao = movimento ? valorParaInput(movimento.valor) : valorInicial ? valorParaInput(valorInicial) : "";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="reserva_id" value={reservaId} />
      <input type="hidden" name="tipo" value={tipo} />
      {movimento && <input type="hidden" name="id" value={movimento.id} />}
      <label className="space-y-1">
        <span className="text-xs text-muted">Valor {tipo === "resgate" ? "resgatado" : tipo === "aporte" ? "aplicado" : ""}</span>
        <CampoValor name="valor" required placeholder="0,00" defaultValue={valorPadrao} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Data</span>
        <input name="data" type="date" required defaultValue={movimento?.data ?? hoje} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Descrição</span>
        <input
          name="descricao"
          placeholder={tipo === "resgate" ? "Ex.: cobrir contas de novembro" : "Opcional"}
          defaultValue={movimento?.descricao ?? ""}
          className={campo}
        />
      </label>
      {tipo === "saldo_inicial" && (
        <label className="space-y-1">
          <span className="text-xs text-muted">Saldo líquido (opcional)</span>
          <CampoValor
            name="saldo_liquido"
            defaultValue={movimento?.valor_liquido != null ? valorParaInput(movimento.valor_liquido) : ""}
            className={campo}
          />
        </label>
      )}
      {state.erro && <p className="text-sm text-negative sm:col-span-full">{state.erro}</p>}
      <Acoes salvando={salvando} aoCancelar={aoTerminar} rotulo={movimento ? "Salvar" : tipo === "resgate" ? "Registrar resgate" : "Registrar aporte"} />
    </form>
  );
}

function FormAtualizar({ r, hoje, aoTerminar }: { r: ReservaView; hoje: string; aoTerminar: () => void }) {
  const [state, action, salvando] = useFormulario(atualizarSaldo, aoTerminar, false);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="reserva_id" value={r.id} />
      <p className="text-sm text-muted sm:col-span-full">
        Digite os saldos que aparecem no app do banco. A diferença do bruto para o registrado ({formatBRL(r.registrado)}) entra como rendimento; o líquido deixa o cálculo do imposto exato.
      </p>
      <label className="space-y-1">
        <span className="text-xs text-muted">Saldo bruto no banco</span>
        <CampoValor
          name="saldo_real"
          required
          defaultValue={r.estimativa ? valorParaInput(r.estimativa.estimado) : ""}
          className={campo}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Saldo líquido no banco (opcional)</span>
        <CampoValor name="saldo_liquido" className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Data</span>
        <input name="data" type="date" required defaultValue={hoje} className={campo} />
      </label>
      {(state.erro || state.ok) && (
        <p className={`text-sm sm:col-span-full ${state.erro ? "text-negative" : "text-positive"}`}>{state.erro ?? state.ok}</p>
      )}
      <Acoes salvando={salvando} aoCancelar={aoTerminar} rotulo="Atualizar" />
    </form>
  );
}

function FormReserva({ reserva, hoje, aoTerminar }: { reserva?: ReservaView; hoje: string; aoTerminar: () => void }) {
  const [state, action, salvando] = useFormulario(salvarReserva, aoTerminar);
  const [indexador, setIndexador] = useState<Indexador>(reserva?.indexador ?? "cdi");

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {reserva && <input type="hidden" name="id" value={reserva.id} />}
      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs text-muted">Nome da caixinha</span>
        <input name="nome" required placeholder="Ex.: Reserva de emergência" defaultValue={reserva?.nome} className={campo} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted">Rendimento</span>
        <select
          name="indexador"
          value={indexador}
          onChange={(ev) => setIndexador(ev.target.value as Indexador)}
          className={campo}
        >
          <option value="cdi">% do CDI</option>
          <option value="prefixado">% ao ano (prefixado)</option>
          <option value="nenhum">Não rende</option>
        </select>
      </label>
      {indexador !== "nenhum" && (
        <label className="space-y-1">
          <span className="text-xs text-muted">{indexador === "cdi" ? "Quantos % do CDI" : "Taxa ao ano (%)"}</span>
          <input
            name="taxa"
            required
            inputMode="decimal"
            placeholder={indexador === "cdi" ? "120" : "12,5"}
            defaultValue={reserva?.taxa != null ? String(reserva.taxa).replace(".", ",") : ""}
            className={campo}
          />
        </label>
      )}
      {!reserva && (
        <>
          <label className="space-y-1">
            <span className="text-xs text-muted">Saldo bruto atual</span>
            <CampoValor name="saldo_inicial" required placeholder="0,00" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Saldo líquido (opcional)</span>
            <CampoValor name="saldo_liquido" placeholder="0,00" className={campo} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Saldo na data</span>
            <input name="data" type="date" required defaultValue={hoje} className={campo} />
          </label>
        </>
      )}
      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs text-muted">Observação</span>
        <input name="obs" defaultValue={reserva?.obs ?? ""} className={campo} />
      </label>
      {reserva && (
        <label className="flex items-center gap-2 text-sm sm:col-span-full">
          <input type="checkbox" name="ativo" defaultChecked={reserva.ativo} /> Ativa (desmarque para arquivar)
        </label>
      )}
      {state.erro && <p className="text-sm text-negative sm:col-span-full">{state.erro}</p>}
      <Acoes salvando={salvando} aoCancelar={aoTerminar} rotulo={reserva ? "Salvar" : "Criar caixinha"} />
    </form>
  );
}
