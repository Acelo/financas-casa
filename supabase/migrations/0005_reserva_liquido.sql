-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Guardar o saldo LÍQUIDO informado pelo banco junto do saldo
--           inicial e das atualizações de saldo. A diferença bruto - líquido
--           é o IR/IOF já embutido no saldo, base do "líquido estimado".
-- =====================================================================

ALTER TABLE public.reserva_movimentos
    ADD COLUMN valor_liquido NUMERIC(12, 2) CHECK (valor_liquido >= 0);

COMMENT ON COLUMN public.reserva_movimentos.valor_liquido IS
    'Saldo líquido total da caixinha nesta data, como mostrado pelo banco (só em saldo_inicial/rendimento)';
