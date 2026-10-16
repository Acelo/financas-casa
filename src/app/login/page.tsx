"use client";

import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    entrar,
    {},
  );

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-2xl vidro p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold">Finanças da Casa</h1>
          <p className="text-sm text-muted">Entre com sua conta</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
          />
        </label>

        {state.erro && (
          <p role="alert" className="text-sm text-negative">
            {state.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
