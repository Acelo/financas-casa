import Link from "next/link";
import { somarMeses } from "@/lib/format";

const campo =
  "rounded-lg border border-border bg-background px-3 py-1.5 text-base outline-none focus:border-accent";

// Uma linha de filtros acima de tudo; atalhos primeiro, intervalo livre depois
export function FiltroPeriodo({ de, ate, atual }: { de: string; ate: string; atual: string }) {
  const atalhos = [
    { rotulo: "3 meses", de: somarMeses(atual, -2), ate: atual },
    { rotulo: "6 meses", de: somarMeses(atual, -5), ate: atual },
    { rotulo: "12 meses", de: somarMeses(atual, -11), ate: atual },
    { rotulo: "Este ano", de: `${atual.slice(0, 4)}-01`, ate: atual },
  ];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1 rounded-lg vidro p-0.5 text-sm">
        {atalhos.map((a) => {
          const ativo = a.de === de && a.ate === ate;
          return (
            <Link
              key={a.rotulo}
              href={`/dashboard?de=${a.de}&ate=${a.ate}`}
              className={`rounded-md px-3 py-1.5 ${ativo ? "bg-background font-medium" : "text-muted hover:text-foreground"}`}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </div>

      <form action="/dashboard" className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs text-muted">De</span>
          <input type="month" name="de" defaultValue={de} key={`de-${de}`} className={campo} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted">Até</span>
          <input type="month" name="ate" defaultValue={ate} key={`ate-${ate}`} className={campo} />
        </label>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          Aplicar
        </button>
      </form>
    </div>
  );
}
