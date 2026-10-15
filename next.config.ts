import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents/partialPrefetching (ligados pelo template) desligados:
  // o streaming de Suspense na navegação duplicava componentes ao trocar
  // de mês. Todas as páginas aqui dependem do login, então renderizar
  // tudo a cada requisição é o modelo certo para este app.
  cacheComponents: false,
  partialPrefetching: false,
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
