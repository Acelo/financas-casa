-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Estrutura do banco do app Finanças da Casa
--   * contas          -> cadastro (une as abas CONTAS e Gastos Fixos)
--   * conta_valores   -> histórico de valor/reajustes de cada conta
--   * lancamentos     -> o que foi previsto/pago em cada mês
--   * receitas        -> salários e extras
--   * juros_obra      -> juros de obra do apartamento (alimenta "Apartamento")
--   * membros         -> e-mails que podem acessar os dados (lista fechada)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Acesso: só quem estiver na tabela membros enxerga/edita os dados
-- ---------------------------------------------------------------------
CREATE TABLE public.membros (
    email       TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_membro()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.membros M
         WHERE 1 = 1
           AND lower(M.email) = lower(auth.jwt() ->> 'email')
    );
$$;

CREATE POLICY membros_select ON public.membros
    FOR SELECT TO authenticated
    USING (public.is_membro());

-- ---------------------------------------------------------------------
-- Cadastro de contas
-- ---------------------------------------------------------------------
CREATE TABLE public.contas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             TEXT NOT NULL UNIQUE,
    categoria        TEXT NOT NULL,
    tipo_valor       TEXT NOT NULL DEFAULT 'fixo'   CHECK (tipo_valor IN ('fixo', 'variavel')),
    origem_valor     TEXT NOT NULL DEFAULT 'manual' CHECK (origem_valor IN ('manual', 'juros_obra')),
    dia_vencimento   SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
    forma_pagamento  TEXT,
    -- true  = aparece todo mês em "Contas do mês"
    -- false = só controle de recorrentes (ex.: assinatura cobrada no cartão,
    --         que já entra na fatura) ou conta avulsa
    gera_lancamento  BOOLEAN NOT NULL DEFAULT true,
    recorrente       BOOLEAN NOT NULL DEFAULT true,
    ativo            BOOLEAN NOT NULL DEFAULT true,
    parcelas_totais  INTEGER CHECK (parcelas_totais > 0),
    obs              TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Valor vigente da conta a partir de um mês (reajustes ficam no histórico)
CREATE TABLE public.conta_valores (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id       UUID NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
    valor          NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
    vigente_desde  DATE NOT NULL CHECK (EXTRACT(DAY FROM vigente_desde) = 1),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (conta_id, vigente_desde)
);

-- ---------------------------------------------------------------------
-- Lançamentos mensais (competência sempre no dia 1 do mês)
-- ---------------------------------------------------------------------
CREATE TABLE public.lancamentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id        UUID NOT NULL REFERENCES public.contas (id) ON DELETE RESTRICT,
    competencia     DATE NOT NULL CHECK (EXTRACT(DAY FROM competencia) = 1),
    valor_previsto  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_pago      NUMERIC(12, 2),
    data_pagamento  DATE,
    status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
    parcela         INTEGER,
    obs             TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (conta_id, competencia)
);

CREATE INDEX lancamentos_competencia_idx ON public.lancamentos (competencia);

-- ---------------------------------------------------------------------
-- Receitas
-- ---------------------------------------------------------------------
CREATE TABLE public.receitas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia  DATE NOT NULL CHECK (EXTRACT(DAY FROM competencia) = 1),
    pessoa       TEXT NOT NULL,
    tipo         TEXT NOT NULL CHECK (tipo IN ('salario', 'extra')),
    descricao    TEXT,
    valor        NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX receitas_competencia_idx ON public.receitas (competencia);

-- ---------------------------------------------------------------------
-- Juros de obra
-- ---------------------------------------------------------------------
CREATE TABLE public.juros_obra (
    competencia     DATE PRIMARY KEY CHECK (EXTRACT(DAY FROM competencia) = 1),
    valor           NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
    data_pagamento  DATE,
    obs             TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variação mês a mês (substitui as colunas Variação / % da planilha)
CREATE OR REPLACE VIEW public.v_juros_obra
WITH (security_invoker = true)
AS
SELECT J.competencia
     , J.valor
     , J.data_pagamento
     , J.obs
     , J.valor - LAG(J.valor) OVER (ORDER BY J.competencia)                AS variacao
     , ROUND(  (J.valor - LAG(J.valor) OVER (ORDER BY J.competencia))
             / NULLIF(LAG(J.valor) OVER (ORDER BY J.competencia), 0) * 100
             , 2)                                                           AS variacao_pct
  FROM public.juros_obra J;

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contas_updated_at      BEFORE UPDATE ON public.contas      FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_lancamentos_updated_at BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_receitas_updated_at    BEFORE UPDATE ON public.receitas    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_juros_obra_updated_at  BEFORE UPDATE ON public.juros_obra  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- Juros de obra -> atualiza o previsto da conta "Apartamento" do mês
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_juros_obra_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.lancamentos L
       SET valor_previsto = NEW.valor
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

CREATE TRIGGER trg_juros_obra_sync
    AFTER INSERT OR UPDATE OF valor ON public.juros_obra
    FOR EACH ROW EXECUTE FUNCTION public.fn_juros_obra_sync();

-- ---------------------------------------------------------------------
-- Gera os lançamentos de um mês a partir do cadastro
--   * fixo      -> último valor vigente em conta_valores
--   * variavel  -> último valor pago (ou valor vigente, se nunca pagou)
--   * juros     -> valor de juros_obra do mês (ou último conhecido)
--   * parcelado -> parcela = anterior + 1; para quando chega no total
-- Não duplica: contas que já têm lançamento no mês são ignoradas.
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

    INSERT INTO public.lancamentos (conta_id, competencia, valor_previsto, parcela)
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
-- RLS: membros têm acesso total; o resto do mundo, nenhum
-- ---------------------------------------------------------------------
ALTER TABLE public.contas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conta_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juros_obra    ENABLE ROW LEVEL SECURITY;

CREATE POLICY contas_membros        ON public.contas        FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
CREATE POLICY conta_valores_membros ON public.conta_valores FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
CREATE POLICY lancamentos_membros   ON public.lancamentos   FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
CREATE POLICY receitas_membros      ON public.receitas      FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());
CREATE POLICY juros_obra_membros    ON public.juros_obra    FOR ALL TO authenticated USING (public.is_membro()) WITH CHECK (public.is_membro());

REVOKE ALL ON FUNCTION public.gerar_lancamentos(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_lancamentos(DATE) TO authenticated;
