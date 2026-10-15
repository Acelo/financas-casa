"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatBRL, mesCurto, nomeDoMes } from "@/lib/format";

// Gráficos em SVG puro. Regras seguidas: um eixo só, marcas finas (barras
// <= 24px com ponta arredondada de 4px, linhas de 2px, pontos >= 8px com anel
// da cor da superfície), grade em linha fina, legenda para 2+ séries, tooltip
// no hover/foco e tabela para ler tudo sem depender do hover.

type Serie = { nome: string; cor: string; valores: (number | null)[] };

const ALTURA = 220; // área do gráfico
const EIXO_X = 28; // faixa dos rótulos de mês (incluída na altura total)
const MARGEM_E = 52;
const MARGEM_D = 12;
const MARGEM_T = 12;

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(600);
  // Mede antes de pintar; o SVG usa width=100% + viewBox, então mesmo antes
  // da medida ele nunca passa da largura do cartão
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = (w: number) => setLargura(Math.max(Math.round(w), 240));
    medir(el.clientWidth);
    const obs = new ResizeObserver(([e]) => medir(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, largura] as const;
}

// Ticks "redondos" (1, 2, 2.5, 5 x 10^n)
function ticks(min: number, max: number, alvo = 4) {
  if (min === max) {
    const folga = Math.abs(max) * 0.1 || 1;
    min -= folga;
    max += folga;
  }
  const bruto = (max - min) / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? bruto;
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const lista: number[] = [];
  for (let v = ini; v <= fim + passo / 2; v += passo) lista.push(Math.round(v * 100) / 100);
  return lista;
}

function fmtEixo(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return v.toLocaleString("pt-BR");
}

// Mostra só alguns rótulos de mês quando não cabem todos
function passoRotulo(larguraFaixa: number) {
  return Math.max(1, Math.ceil(44 / larguraFaixa));
}

function Legenda({ series, tipo }: { series: Serie[]; tipo: "barra" | "linha" }) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-4 text-sm text-muted">
      {series.map((s) => (
        <li key={s.nome} className="flex items-center gap-1.5">
          {tipo === "barra" ? (
            <span className="inline-block size-2.5 rounded-sm" style={{ background: s.cor }} />
          ) : (
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: s.cor }} />
          )}
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({
  x,
  largura,
  titulo,
  linhas,
}: {
  x: number;
  largura: number;
  titulo: string;
  linhas: { rotulo: string; valor: number | null; cor?: string }[];
}) {
  const w = 190;
  const left = Math.min(Math.max(x - w / 2, 0), largura - w);
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg"
      style={{ left, width: w }}
    >
      <p className="mb-1 text-xs text-muted">{titulo}</p>
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex items-center gap-2">
          {l.cor && <span className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ background: l.cor }} />}
          <span className="font-semibold tabular-nums">{l.valor === null ? "-" : formatBRL(l.valor)}</span>
          <span className="ml-auto truncate text-xs text-muted">{l.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

function Tabela({
  meses,
  colunas,
}: {
  meses: string[];
  colunas: { nome: string; valores: (number | null)[] }[];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted">Ver tabela</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1 pr-3 font-normal">Mês</th>
              {colunas.map((c) => (
                <th key={c.nome} className="py-1 pr-3 text-right font-normal">{c.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meses.map((m, i) => (
              <tr key={m} className="border-t border-border">
                <td className="py-1 pr-3">{mesCurto(m)}</td>
                {colunas.map((c) => (
                  <td key={c.nome} className="py-1 pr-3 text-right">
                    {c.valores[i] === null ? "-" : formatBRL(c.valores[i])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Grade({ escala, ys, largura }: { escala: (v: number) => number; ys: number[]; largura: number }) {
  return (
    <g>
      {ys.map((v) => (
        <g key={v}>
          <line x1={MARGEM_E} x2={largura - MARGEM_D} y1={escala(v)} y2={escala(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
          <text x={MARGEM_E - 8} y={escala(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmtEixo(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

// Coluna com ponta arredondada (4px) e base reta
function colunaPath(x: number, y: number, w: number, base: number) {
  const h = base - y;
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

export function Colunas({
  meses,
  series,
  extra,
}: {
  meses: string[];
  series: { nome: string; cor: string; valores: number[] }[];
  // Valor sem barra, mostrado só no tooltip e na tabela (ex.: saldo)
  extra?: { nome: string; valores: number[] };
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(0, ...series.flatMap((s) => s.valores));
  const ys = ticks(0, max);
  const topo = ys.at(-1)!;
  const base = MARGEM_T + ALTURA;
  const escala = (v: number) => base - (v / topo) * ALTURA;

  const plotW = largura - MARGEM_E - MARGEM_D;
  const faixa = plotW / meses.length;
  const gap = 2;
  const barW = Math.max(2, Math.min(24, (faixa * 0.7 - gap * (series.length - 1)) / series.length));
  const grupoW = barW * series.length + gap * (series.length - 1);
  const passo = passoRotulo(faixa);

  return (
    <div>
      <Legenda series={series} tipo="barra" />
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width="100%" viewBox={`0 0 ${largura} ${base + EIXO_X}`} className="block overflow-visible" role="img" aria-label="Gráfico de colunas por mês">
          <Grade escala={escala} ys={ys} largura={largura} />
          {meses.map((m, i) => {
            const x0 = MARGEM_E + faixa * i + (faixa - grupoW) / 2;
            const apagado = hover !== null && hover !== i;
            return (
              <g
                key={m}
                tabIndex={0}
                onPointerMove={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
                opacity={apagado ? 0.45 : 1}
              >
                <rect x={MARGEM_E + faixa * i} y={MARGEM_T} width={faixa} height={ALTURA} fill="transparent" />
                {series.map((s, k) => (
                  <path key={s.nome} d={colunaPath(x0 + k * (barW + gap), escala(s.valores[i]), barW, base)} fill={s.cor} />
                ))}
                {i % passo === 0 && (
                  <text x={MARGEM_E + faixa * (i + 0.5)} y={base + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">
                    {mesCurto(m)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <Tooltip
            x={MARGEM_E + faixa * (hover + 0.5)}
            largura={largura}
            titulo={nomeDoMes(meses[hover])}
            linhas={[
              ...series.map((s) => ({ rotulo: s.nome, valor: s.valores[hover], cor: s.cor })),
              ...(extra ? [{ rotulo: extra.nome, valor: extra.valores[hover] }] : []),
            ]}
          />
        )}
      </div>
      <Tabela meses={meses} colunas={extra ? [...series, extra] : series} />
    </div>
  );
}

export function Linhas({ meses, series }: { meses: string[]; series: Serie[] }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const valores = series.flatMap((s) => s.valores).filter((v): v is number => v !== null);
  if (!valores.length) valores.push(0);
  const ys = ticks(Math.min(...valores), Math.max(...valores));
  const yMin = ys[0];
  const yMax = ys.at(-1)!;
  const base = MARGEM_T + ALTURA;
  const escala = (v: number) => base - ((v - yMin) / (yMax - yMin)) * ALTURA;

  const plotW = largura - MARGEM_E - MARGEM_D;
  const faixa = plotW / meses.length;
  const xDe = (i: number) => MARGEM_E + faixa * (i + 0.5);
  const passo = passoRotulo(faixa);
  const comPontos = meses.length <= 18;

  // Quebra a linha nos meses sem valor
  function caminho(vals: (number | null)[]) {
    let d = "";
    let novo = true;
    vals.forEach((v, i) => {
      if (v === null) {
        novo = true;
        return;
      }
      d += `${novo ? "M" : "L"}${xDe(i)},${escala(v)}`;
      novo = false;
    });
    return d;
  }

  function apontar(clientX: number) {
    const rect = ref.current!.getBoundingClientRect();
    const i = Math.floor((clientX - rect.left - MARGEM_E) / faixa);
    setHover(Math.min(Math.max(i, 0), meses.length - 1));
  }

  const unica = series.length === 1 ? series[0] : null;
  const ultimo = unica ? unica.valores.findLastIndex((v) => v !== null) : -1;

  return (
    <div>
      <Legenda series={series} tipo="linha" />
      {/* Série única: o último valor vai no topo, sem disputar espaço com a linha */}
      {unica && ultimo >= 0 && (
        <p className="mb-2 text-sm text-muted">
          Último: <span className="font-semibold text-foreground">{formatBRL(unica.valores[ultimo])}</span>{" "}
          em {mesCurto(meses[ultimo])}
        </p>
      )}
      <div
        ref={ref}
        className="relative outline-none"
        tabIndex={0}
        onPointerMove={(e) => apontar(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover((h) => Math.min((h ?? -1) + 1, meses.length - 1));
          if (e.key === "ArrowLeft") setHover((h) => Math.max((h ?? meses.length) - 1, 0));
        }}
      >
        <svg width="100%" viewBox={`0 0 ${largura} ${base + EIXO_X}`} className="block overflow-visible" role="img" aria-label="Gráfico de linhas por mês">
          <Grade escala={escala} ys={ys} largura={largura} />
          {meses.map((m, i) =>
            i % passo === 0 ? (
              <text key={m} x={xDe(i)} y={base + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {mesCurto(m)}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <line x1={xDe(hover)} x2={xDe(hover)} y1={MARGEM_T} y2={base} stroke="var(--axis)" strokeWidth={1} />
          )}
          {series.map((s) => (
            <g key={s.nome}>
              <path d={caminho(s.valores)} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.valores.map((v, i) =>
                v !== null && (comPontos || i === hover) ? (
                  <circle key={i} cx={xDe(i)} cy={escala(v)} r={i === hover ? 5 : 4} fill={s.cor} stroke="var(--surface)" strokeWidth={2} />
                ) : null,
              )}
            </g>
          ))}
        </svg>
        {hover !== null && (
          <Tooltip
            x={xDe(hover)}
            largura={largura}
            titulo={nomeDoMes(meses[hover])}
            linhas={series.map((s) => ({ rotulo: s.nome, valor: s.valores[hover], cor: s.cor }))}
          />
        )}
      </div>
      <Tabela meses={meses} colunas={series} />
    </div>
  );
}

export function BarrasHorizontais({
  itens,
  total,
}: {
  itens: { rotulo: string; valor: number }[];
  total: number;
}) {
  if (!itens.length) {
    return <p className="py-8 text-center text-sm text-muted">Sem dados no período.</p>;
  }
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-3">
      {itens.map((i) => (
        <li key={i.rotulo} title={`${i.rotulo}: ${formatBRL(i.valor)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{i.rotulo}</span>
            <span className="whitespace-nowrap tabular-nums">
              <span className="font-medium">{formatBRL(i.valor)}</span>
              <span className="ml-2 text-xs text-muted">
                {total > 0 ? `${((i.valor / total) * 100).toFixed(0)}%` : ""}
              </span>
            </span>
          </div>
          <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max((i.valor / max) * 100, 0.5)}%`, background: "var(--series-1)" }} />
        </li>
      ))}
    </ul>
  );
}

export function EvolucaoConta({
  meses,
  contas,
}: {
  meses: string[];
  contas: { nome: string; valores: (number | null)[] }[];
}) {
  const [nome, setNome] = useState(contas[0]?.nome ?? "");
  const conta = contas.find((c) => c.nome === nome) ?? contas[0];

  if (!conta) {
    return <p className="py-8 text-center text-sm text-muted">Sem dados no período.</p>;
  }
  return (
    <div>
      <select
        value={conta.nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label="Conta"
        className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent sm:w-auto"
      >
        {contas.map((c) => (
          <option key={c.nome}>{c.nome}</option>
        ))}
      </select>
      <Linhas meses={meses} series={[{ nome: conta.nome, cor: "var(--series-1)", valores: conta.valores }]} />
    </div>
  );
}
