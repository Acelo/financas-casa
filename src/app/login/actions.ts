"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { erro?: string };

export async function entrar(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: "E-mail ou senha inválidos." };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type SenhaState = { erro?: string; ok?: string };

const SENHA_MIN = 8;

// Define uma nova senha para quem está logado: tanto "Trocar senha" no app
// quanto quem chegou pelo link de redefinição do e-mail (o link já cria a
// sessão de recuperação)
export async function definirNovaSenha(
  _prev: SenhaState,
  formData: FormData,
): Promise<SenhaState> {
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (senha.length < SENHA_MIN) return { erro: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.` };
  if (senha !== confirmar) return { erro: "As duas senhas não são iguais." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    if (/different from the old/i.test(error.message)) {
      return { erro: "A nova senha precisa ser diferente da atual." };
    }
    if (/session|not authenticated|jwt/i.test(error.message)) {
      return { erro: "Sua sessão expirou. Peça um novo link de redefinição." };
    }
    return { erro: "Não foi possível trocar a senha. Tente de novo." };
  }
  return { ok: "Senha alterada." };
}

// "Esqueci minha senha": envia o e-mail com o link. A resposta é a mesma
// exista ou não o e-mail, para não revelar quem tem conta.
export async function pedirRedefinicao(
  _prev: SenhaState,
  formData: FormData,
): Promise<SenhaState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirmar?next=/redefinir-senha`,
  });

  if (error && /rate limit|security purposes|seconds/i.test(error.message)) {
    return { erro: "Muitas tentativas seguidas. Espere um minuto e tente de novo." };
  }
  return {
    ok: "Se esse e-mail tiver conta no Koda, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.",
  };
}
