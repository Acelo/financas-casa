-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Registro dos backups (manual pelo app e automático semanal
--           pelo GitHub Actions), para o app mostrar data/hora do último.
-- =====================================================================

CREATE TABLE public.backups (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo           TEXT NOT NULL CHECK (tipo IN ('manual', 'automatico')),
    arquivo        TEXT,
    tamanho_bytes  BIGINT,
    -- Preenchido pelo app; no automático (usuário postgres) fica nulo
    criado_por     TEXT DEFAULT (auth.jwt() ->> 'email'),
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX backups_criado_em_idx ON public.backups (criado_em DESC);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY backups_select ON public.backups
    FOR SELECT TO authenticated
    USING (public.is_membro());

CREATE POLICY backups_insert ON public.backups
    FOR INSERT TO authenticated
    WITH CHECK (public.is_membro() AND tipo = 'manual');
