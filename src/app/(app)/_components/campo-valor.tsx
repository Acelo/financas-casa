"use client";

import { useEffect, useRef, useState } from "react";

// Campo de dinheiro com máscara de banco: só números, os centavos entram
// pela direita (265089 -> 2.650,89). O valor enviado no formulário fica no
// formato "2.650,89", que o servidor já sabe ler (lerValor).

const MAX_DIGITOS = 13; // até 99.999.999.999,99

function soDigitos(texto: string) {
  return texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITOS);
}

// Valor inicial vindo do banco ("258,29", "258.29", 258.29) -> "25829"
function digitosIniciais(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "";
  const texto = typeof v === "number" ? v.toFixed(2) : String(v);
  const [inteiro, dec = ""] = texto.includes(",")
    ? texto.replace(/\./g, "").split(",")
    : texto.split(".");
  return soDigitos(inteiro + dec.padEnd(2, "0").slice(0, 2));
}

export function formatarDigitos(d: string) {
  if (!d) return "";
  const p = d.padStart(3, "0");
  const inteiro = p.slice(0, -2).replace(/^0+(?=\d)/, "");
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${milhar},${p.slice(-2)}`;
}

// Colar "2650,89", "2.650,89" ou "2650.89": respeita os centavos de quem colou
function digitosDeColagem(texto: string) {
  const limpo = texto.trim().replace(/[^\d.,]/g, "");
  const m = limpo.match(/[.,](\d{1,2})$/);
  if (!m) return soDigitos(limpo + "00");
  const inteiro = limpo.slice(0, -m[0].length).replace(/[.,]/g, "");
  return soDigitos(inteiro + m[1].padEnd(2, "0"));
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "value" | "onChange" | "type"> & {
  name: string;
  defaultValue?: string | number | null;
};

export function CampoValor({ defaultValue, onPaste, onFocus, ...props }: Props) {
  const [digitos, setDigitos] = useState(() => digitosIniciais(defaultValue));
  const ref = useRef<HTMLInputElement>(null);

  // Digitar sempre acrescenta à direita e apagar sempre tira da direita,
  // não importa onde o cursor esteja (o "beforeinput" nativo vem antes do
  // navegador mexer no texto)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function antes(e: InputEvent) {
      if (e.inputType === "insertText" || e.inputType === "insertCompositionText") {
        e.preventDefault();
        const novos = (e.data ?? "").replace(/\D/g, "");
        if (novos) setDigitos((d) => soDigitos(d + novos));
      } else if (e.inputType.startsWith("delete")) {
        e.preventDefault();
        setDigitos((d) => d.slice(0, -1));
      }
    }
    el.addEventListener("beforeinput", antes);
    return () => el.removeEventListener("beforeinput", antes);
  }, []);

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatarDigitos(digitos)}
      // Plano B (ex.: navegador sem beforeinput): lê os números do texto todo
      onChange={(e) => setDigitos(soDigitos(e.target.value))}
      onFocus={(e) => {
        onFocus?.(e);
        const el = e.currentTarget;
        requestAnimationFrame(() => {
          const fim = el.value.length;
          el.setSelectionRange(fim, fim);
        });
      }}
      onPaste={(e) => {
        onPaste?.(e);
        e.preventDefault();
        setDigitos(digitosDeColagem(e.clipboardData.getData("text")));
      }}
      // O cursor fica sempre no fim, como nos apps de banco
      onSelect={(e) => {
        const el = e.currentTarget;
        const fim = el.value.length;
        if (el.selectionStart !== fim || el.selectionEnd !== fim) el.setSelectionRange(fim, fim);
      }}
    />
  );
}
