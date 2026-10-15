-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Ao lançar/alterar juros de obra, atualizar também o valor
--           pago da conta "Apartamento" quando ela já estiver paga
--           (o valor dos juros é exatamente o que foi pago no mês).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_juros_obra_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.lancamentos L
       SET valor_previsto = NEW.valor
         , valor_pago     = CASE
                                WHEN L.status = 'pago' THEN NEW.valor
                                ELSE L.valor_pago
                            END
     WHERE 1 = 1
       AND L.competencia = NEW.competencia
       AND L.conta_id IN (
               SELECT C.id
                 FROM public.contas C
                WHERE 1 = 1
                  AND C.origem_valor = 'juros_obra'
           );
    RETURN NEW;
END;
$$;
