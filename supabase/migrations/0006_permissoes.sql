-- =====================================================================
-- CRIADA POR: TULIO - 21/10/2026
-- OBJETIVO: Permissões explícitas da API (Data API / supabase-js).
--   A partir de 30/10/2026 a Supabase deixa de conceder acesso automático
--   a tabelas novas do schema public. As tabelas existentes não mudam, mas
--   este arquivo garante que recriar o banco (projeto novo ou restauração
--   de backup) continue funcionando. Pode rodar quantas vezes quiser.
--
--   Só "authenticated" (usuário logado) e "service_role" (servidor).
--   O "anon" (visitante sem login) não recebe nada: o Koda não lê dados
--   sem login, e as regras de acesso (RLS) continuam valendo por cima.
--
--   IMPORTANTE: toda tabela nova criada daqui em diante deve trazer o
--   GRANT na mesma migração (modelo no final deste arquivo).
-- =====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
   ON public.membros
    , public.contas
    , public.conta_valores
    , public.lancamentos
    , public.receitas
    , public.juros_obra
    , public.backups
    , public.reservas
    , public.reserva_movimentos
   TO authenticated, service_role;

GRANT SELECT
   ON public.v_juros_obra
   TO authenticated, service_role;

GRANT EXECUTE
   ON FUNCTION public.gerar_lancamentos(DATE)
   TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- Modelo para tabelas novas (copiar para a migração que cria a tabela):
--
-- GRANT SELECT, INSERT, UPDATE, DELETE
--    ON public.nova_tabela
--    TO authenticated, service_role;
-- ---------------------------------------------------------------------
