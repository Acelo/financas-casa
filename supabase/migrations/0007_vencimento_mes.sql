-- =====================================================================
-- CRIADA POR: TULIO - 22/10/2026
-- OBJETIVO: Vencimento específico de um mês. Quando nulo, vale o dia de
--           vencimento do cadastro da conta (contas.dia_vencimento). Serve
--           para quando a conta vence num dia diferente só naquele mês.
--           (Coluna nova em tabela existente: não precisa de GRANT.)
-- =====================================================================

ALTER TABLE public.lancamentos
    ADD COLUMN vencimento DATE;

COMMENT ON COLUMN public.lancamentos.vencimento IS
    'Vencimento deste mês quando diferente do dia do cadastro; nulo = usa contas.dia_vencimento';
