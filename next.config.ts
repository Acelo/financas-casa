import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents/partialPrefetching (ligados pelo template) desligados:
  // o streaming de Suspense na navegação duplicava componentes ao trocar
  // de mês. Todas as páginas aqui dependem do login, então renderizar
  // tudo a cada requisição é o modelo certo para este app.
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    // Abas vizinhas são pré-carregadas (router.prefetch) para o deslizar ser
    // instantâneo. 60s em vez de 5min: o que a outra pessoa alterar em outro
    // aparelho aparece rápido. Alterações feitas aqui já limpam o cache.
    staleTimes: { static: 60 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
