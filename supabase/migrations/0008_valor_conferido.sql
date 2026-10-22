-- =====================================================================
-- CRIADA POR: TULIO - 22/10/2026
-- OBJETIVO: Lembrete de "valor ainda não editado" nas contas variáveis.
--   * lancamentos.valor_conferido: false = o valor previsto ainda é uma
--     estimativa copiada do mês anterior (fatura/boleto ainda não chegou)
--   * gerar_lancamentos: contas variáveis nascem com valor_conferido=false
--     (o Apartamento só quando ainda não há juros de obra do mês)
--   * juros de obra lançado: o Apartamento do mês passa a conferido
--   (Coluna nova em tabela existente: não precisa de GRANT.)
-- =====================================================================

ALTER TABLE public.lancamentos
    ADD COLUMN valor_conferido BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.lancamentos.valor_conferido IS
    'false = valor previsto ainda é a estimativa do mês anterior (lembrar de atualizar)';

-- Meses já gerados: contas variáveis pendentes do mês atual em diante
-- ficam marcadas para conferir
UPDATE public.lancamentos L
   SET valor_conferido = false
  FROM public.contas C
 WHERE 1 = 1
   AND C.id = L.conta_id
   AND C.tipo_valor = 'variavel'
   AND C.origem_valor = 'manual'
   AND L.status = 'pendente'
   AND L.competencia >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::DATE;

-- ---------------------------------------------------------------------
-- Gera os lançamentos do mês (mesma regra de antes + valor_conferido)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_lancamentos(p_competencia DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_comp   DATE := date_trunc('month', p_competencia)::DATE;
    v_total  INTEGER;
BEGIN
    IF NOT public.is_membro() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    INSERT INTO public.lancamentos (conta_id, competencia, valor_previsto, parcela, valor_conferido)
    SELECT C.id
         , v_comp
         , COALESCE(
               CASE
                   WHEN C.origem_valor = 'juros_obra' THEN (
                        SELECT J.valor
                          FROM public.juros_obra J
                         WHERE 1 = 1
                           AND J.competencia <= v_comp
                         ORDER BY J.competencia DESC
                         LIMIT 1
                   )
                   WHEN C.tipo_valor = 'variavel' THEN (
                        SELECT L.valor_pago
                          FROM public.lancamentos L
                         WHERE 1 = 1
                           AND L.conta_id = C.id
                           AND L.competencia < v_comp
                           AND L.valor_pago IS NOT NULL
                         ORDER BY L.competencia DESC
                         LIMIT 1
                   )
               END
             , (
                   SELECT V.valor
                     FROM public.conta_valores V
                    WHERE 1 = 1
                      AND V.conta_id = C.id
                      AND V.vigente_desde <= v_comp
                    ORDER BY V.vigente_desde DESC
                    LIMIT 1
               )
             , 0
           )
         , CASE
               WHEN C.parcelas_totais IS NOT NULL THEN COALESCE(ULT.parcela, 0) + 1
           END
         , CASE
               -- Apartamento: conferido só se o juros do próprio mês já existe
               WHEN C.origem_valor = 'juros_obra' THEN EXISTS (
                        SELECT 1
                          FROM public.juros_obra J
                         WHERE 1 = 1
                           AND J.competencia = v_comp
                    )
               ELSE C.tipo_valor <> 'variavel'
           END
      FROM public.contas C
      LEFT JOIN LATERAL (
               SELECT L.parcela
                 FROM public.lancamentos L
                WHERE 1 = 1
                  AND L.conta_id = C.id
                  AND L.competencia < v_comp
                ORDER BY L.competencia DESC
                LIMIT 1
           ) ULT ON true
     WHERE 1 = 1
       AND C.ativo
       AND C.recorrente
       AND C.gera_lancamento
       AND (   C.parcelas_totais IS NULL
            OR COALESCE(ULT.parcela, 0) < C.parcelas_totais)
       AND NOT EXISTS (
               SELECT 1
                 FROM public.lancamentos L
                WHERE 1 = 1
                  AND L.conta_id = C.id
                  AND L.competencia = v_comp
           );

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN v_total;
END;
$$;

-- ---------------------------------------------------------------------
-- Juros de obra lançado/alterado: o Apartamento do mês fica conferido
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_juros_obra_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.lancamentos L
       SET valor_previsto  = NEW.valor
         , valor_pago      = CASE
                                 WHEN L.status = 'pago' THEN NEW.valor
                                 ELSE L.valor_pago
                             END
         , valor_conferido = true
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
