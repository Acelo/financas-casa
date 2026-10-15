-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Controle de reservas (caixinhas/CDB)
--   * reservas            -> cada caixinha, com nome e rentabilidade
--   * reserva_movimentos  -> saldo inicial, aportes, resgates e rendimentos
-- Rendimento: "Atualizar saldo" grava a diferença entre o saldo real
-- informado e o saldo registrado como um movimento do tipo 'rendimento'.
-- Entre uma atualização e outra o app estima o rendimento pelo CDI.
-- =====================================================================

CREATE TABLE public.reservas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL UNIQUE,
    -- cdi       -> taxa = % do CDI (ex.: 120 = 120% do CDI)
    -- prefixado -> taxa = % ao ano (ex.: 12,5)
    -- nenhum    -> não rende (ex.: dinheiro guardado em conta)
    indexador   TEXT NOT NULL DEFAULT 'cdi' CHECK (indexador IN ('cdi', 'prefixado', 'nenhum')),
    taxa        NUMERIC(8, 2) CHECK (taxa >= 0),
    ativo       BOOLEAN NOT NULL DEFAULT true,
    obs         TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reserva_movimentos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id  UUID NOT NULL REFERENCES public.reservas (id) ON DELETE CASCADE,
    data        DATE NOT NULL,
    tipo        TEXT NOT NULL CHECK (tipo IN ('saldo_inicial', 'aporte', 'resgate', 'rendimento')),
    -- Sempre positivo, o sinal vem do tipo; só rendimento pode ser negativo
    -- (ajuste quando o saldo real ficou abaixo do registrado)
    valor       NUMERIC(12, 2) NOT NULL,
    descricao   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (   (tipo =  'rendimento' AND valor <> 0)
           OR (tipo <> 'rendimento' AND valor >  0))
);

CREATE INDEX reserva_movimentos_reserva_data_idx ON public.reserva_movimentos (reserva_id, data);
CREATE INDEX reserva_movimentos_data_idx ON public.reserva_movimentos (data);

CREATE TRIGGER trg_reservas_updated_at           BEFORE UPDATE ON public.reservas           FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_reserva_movimentos_updated_at BEFORE UPDATE ON public.reserva_movimentos FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

ALTER TABLE public.reservas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservas_membros           ON public.reservas           FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
CREATE POLICY reserva_movimentos_membros ON public.reserva_movimentos FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
