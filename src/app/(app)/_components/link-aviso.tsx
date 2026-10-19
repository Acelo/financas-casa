"use client";

import Link from "next/link";
import { avisarAbrindo } from "./aviso-navegacao";

// Link que mostra "Abrindo {rotulo}..." enquanto a tela carrega.
// Para usar em componentes de servidor (cabeçalho, tela inicial).
export function LinkAviso({
  rotulo,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & { rotulo: string }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        // Ctrl/Cmd+clique abre em outra aba: aqui nada muda
        if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          avisarAbrindo(rotulo, String(props.href));
        }
      }}
    />
  );
}
