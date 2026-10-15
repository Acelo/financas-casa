import Link from "next/link";
import { nomeDoMes, somarMeses } from "@/lib/format";

export function MesNav({ mes, base }: { mes: string; base: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={`${base}?mes=${somarMeses(mes, -1)}`} className="rounded-md px-3 py-1 text-xl text-muted hover:bg-surface">
        ‹
      </Link>
      <h1 className="text-lg font-semibold">{nomeDoMes(mes)}</h1>
      <Link href={`${base}?mes=${somarMeses(mes, 1)}`} className="rounded-md px-3 py-1 text-xl text-muted hover:bg-surface">
        ›
      </Link>
    </div>
  );
}

export function Resumo({
  titulo,
  valor,
  cor,
  className = "",
}: {
  titulo: string;
  valor: string;
  cor?: "positivo" | "negativo";
  className?: string;
}) {
  const classeCor =
    cor === "positivo" ? "text-positive" : cor === "negativo" ? "text-negative" : "";
  return (
    <div className={`min-w-0 rounded-xl border border-border bg-surface p-3 ${className}`}>
      <p className="text-xs text-muted">{titulo}</p>
      <p className={`whitespace-nowrap text-lg font-semibold tabular-nums ${classeCor}`}>
        {valor}
      </p>
    </div>
  );
}
