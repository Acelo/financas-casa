"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoBackup() {
  const router = useRouter();
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setBaixando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/backup", { cache: "no-store" });
      if (!resp.ok) {
        const corpo = await resp.json().catch(() => ({}));
        throw new Error(corpo.erro ?? `Erro ${resp.status}`);
      }
      const nome =
        resp.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "financas-casa-backup.json";
      const url = URL.createObjectURL(await resp.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh(); // atualiza "último backup"
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar o backup.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={baixar}
        disabled={baixando}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
      >
        {baixando ? "Gerando..." : "Baixar backup agora"}
      </button>
      {erro && <p className="text-sm text-negative">{erro}</p>}
    </div>
  );
}
