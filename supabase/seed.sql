-- =====================================================================
-- CRIADA POR: TULIO - 15/10/2026
-- OBJETIVO: Carga inicial vinda da planilha "Contas a pagar.xlsx"
--   * cadastro de contas (abas CONTAS + Gastos Fixos)
--   * lançamentos de 10/2026 (coluna F da aba CONTAS)
--   * histórico de juros de obra (03/2026 a 10/2026)
-- Origem dos números: data/import/*.json
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cadastro de contas
-- gera_lancamento = false -> assinaturas no crédito (já entram na fatura
-- do cartão; ficam só para a análise de recorrentes)
-- ---------------------------------------------------------------------
INSERT INTO public.contas
     ( nome,                 categoria,       tipo_valor, origem_valor, dia_vencimento, forma_pagamento,            gera_lancamento, recorrente, ativo, parcelas_totais, obs )
VALUES
     ( 'Apartamento',        'Financiamento', 'variavel', 'juros_obra', 10,             'Boleto (Caixa)',           true,            true,       true,  NULL,            'Juros de obra. Na planilha de fixos: Apto Novo, estimativa 3.000' )
   , ( 'Aluguel',            'Moradia',       'fixo',     'manual',     10,             'Boleto',                   true,            true,       true,  NULL,            NULL )
   , ( 'Condomínio',         'Moradia',       'fixo',     'manual',     12,             'Boleto',                   true,            true,       true,  NULL,            NULL )
   , ( 'Carro',              'Financiamento', 'fixo',     'manual',     7,              'Débito automático (Itaú)', true,            true,       true,  60,              NULL )
   , ( 'Cartão NU Tulio',    'Cartão',        'variavel', 'manual',     9,              NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão C6',          'Cartão',        'variavel', 'manual',     10,             NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão NU Letícia',  'Cartão',        'variavel', 'manual',     12,             NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão Carre4',      'Cartão',        'variavel', 'manual',     8,              NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão Saveg',       'Cartão',        'variavel', 'manual',     10,             NULL,                       true,            true,       true,  NULL,            'Vem zerado caso não faça compras' )
   , ( 'Cartão Ponto (Let)', 'Cartão',        'variavel', 'manual',     13,             NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão Ponto (Tul)', 'Cartão',        'variavel', 'manual',     13,             NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão Passaí',      'Cartão',        'variavel', 'manual',     NULL,           NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Cartão ITAU (Let)',  'Cartão',        'variavel', 'manual',     NULL,           NULL,                       true,            true,       true,  NULL,            NULL )
   , ( 'Energia (CPFL)',     'Moradia',       'variavel', 'manual',     20,             'Boleto',                   true,            true,       true,  NULL,            'Média de referência: 250,00' )
   , ( 'FIES',               'Financiamento', 'fixo',     'manual',     11,             'Boleto',                   true,            true,       true,  177,             NULL )
   , ( 'Internet',           'Serviços',      'fixo',     'manual',     12,             'Boleto',                   true,            true,       true,  NULL,            '- 10 reais se pagar no prazo' )
   , ( 'Empréstimo NU',      'Financiamento', 'fixo',     'manual',     10,             NULL,                       true,            true,       false, 12,              'Finalizado em 10/2026' )
   , ( 'IPVA',               'Impostos',      'fixo',     'manual',     13,             'Nubank',                   true,            true,       false, 5,               'Finalizado em 10/2026' )
   , ( 'Dentista',           'Saúde',         'fixo',     'manual',     NULL,           'Dinheiro',                 true,            false,      true,  NULL,            'Gasto avulso' )
   -- Recorrentes só para análise (cobrados no cartão de crédito)
   , ( 'Prime',              'Streaming',     'fixo',     'manual',     NULL,           'Crédito',                  false,           true,       false, 12,              NULL )
   , ( 'HBO Max',            'Streaming',     'fixo',     'manual',     15,             'Crédito',                  false,           true,       true,  12,              NULL )
   , ( 'Disney Plus',        'Streaming',     'fixo',     'manual',     NULL,           'Crédito',                  false,           true,       false, NULL,            NULL )
   , ( 'Netflix',            'Streaming',     'fixo',     'manual',     2,              'Crédito',                  false,           true,       false, NULL,            NULL )
   , ( 'Spotify',            'Streaming',     'fixo',     'manual',     6,              'Crédito',                  false,           true,       true,  NULL,            NULL )
   , ( 'Youtube',            'Streaming',     'fixo',     'manual',     12,             'Crédito',                  false,           true,       true,  NULL,            NULL )
   , ( 'Seguro Youse',       'Seguro',        'fixo',     'manual',     8,              'Crédito',                  false,           true,       true,  NULL,            NULL )
   , ( 'Meli +',             'Serviços',      'fixo',     'manual',     NULL,           'Crédito',                  false,           true,       true,  NULL,            NULL )
   , ( 'iCloud',             'Serviços',      'fixo',     'manual',     6,              'Crédito',                  false,           true,       true,  NULL,            NULL )
   , ( 'iFood',              'Serviços',      'fixo',     'manual',     24,             'Crédito',                  false,           true,       false, NULL,            NULL );

-- ---------------------------------------------------------------------
-- Valores vigentes a partir de 10/2026
-- ---------------------------------------------------------------------
INSERT INTO public.conta_valores (conta_id, valor, vigente_desde)
SELECT C.id
     , X.valor
     , DATE '2026-10-01'
  FROM ( VALUES
             ( 'Apartamento',        3000.00 )
           , ( 'Aluguel',             850.00 )
           , ( 'Condomínio',          381.27 )
           , ( 'Carro',              1599.43 )
           , ( 'Cartão NU Tulio',    1578.55 )
           , ( 'Cartão C6',          5326.04 )
           , ( 'Cartão NU Letícia',    30.72 )
           , ( 'Cartão Carre4',         0.00 )
           , ( 'Cartão Saveg',          0.00 )
           , ( 'Cartão Ponto (Let)',   15.00 )
           , ( 'Cartão Ponto (Tul)',   15.00 )
           , ( 'Cartão Passaí',        16.65 )
           , ( 'Cartão ITAU (Let)',     0.00 )
           , ( 'Energia (CPFL)',      250.00 )
           , ( 'FIES',                258.29 )
           , ( 'Internet',            118.00 )
           , ( 'Empréstimo NU',       360.98 )
           , ( 'IPVA',                531.62 )
           , ( 'Dentista',            100.00 )
           , ( 'Prime',                13.90 )
           , ( 'HBO Max',              44.90 )
           , ( 'Disney Plus',          46.82 )
           , ( 'Netflix',              59.90 )
           , ( 'Spotify',              27.90 )
           , ( 'Youtube',              26.90 )
           , ( 'Seguro Youse',        250.38 )
           , ( 'Meli +',                8.90 )
           , ( 'iCloud',               19.90 )
           , ( 'iFood',                 5.95 )
       ) AS X (nome, valor)
  JOIN public.contas C ON C.nome = X.nome
 WHERE 1 = 1;

-- ---------------------------------------------------------------------
-- Juros de obra (pagos todo dia 10)
-- ---------------------------------------------------------------------
INSERT INTO public.juros_obra (competencia, valor, data_pagamento)
VALUES
     ( DATE '2026-03-01', 1818.18, DATE '2026-03-10' )
   , ( DATE '2026-04-01', 1292.52, DATE '2026-04-10' )
   , ( DATE '2026-05-01', 1654.41, DATE '2026-05-10' )
   , ( DATE '2026-06-01', 2026.14, DATE '2026-06-10' )
   , ( DATE '2026-07-01', 2029.32, DATE '2026-07-10' )
   , ( DATE '2026-08-01', 2342.94, DATE '2026-08-10' )
   , ( DATE '2026-09-01', 2247.74, DATE '2026-09-10' )
   , ( DATE '2026-10-01', 2533.12, DATE '2026-10-10' );

-- ---------------------------------------------------------------------
-- Lançamentos de 10/2026 (coluna F). Internet estava pendente na planilha.
-- ---------------------------------------------------------------------
INSERT INTO public.lancamentos (conta_id, competencia, valor_previsto, valor_pago, status, parcela)
SELECT C.id
     , DATE '2026-10-01'
     , X.valor
     , CASE WHEN X.status = 'pago' THEN X.valor END
     , X.status
     , X.parcela
  FROM ( VALUES
             ( 'Apartamento',        2533.12, 'pago',     NULL::INTEGER )
           , ( 'Aluguel',             850.00, 'pago',     NULL )
           , ( 'Condomínio',          381.27, 'pago',     NULL )
           , ( 'Carro',              1599.43, 'pago',     14 )
           , ( 'Cartão NU Tulio',    1578.55, 'pago',     NULL )
           , ( 'Cartão C6',          5326.04, 'pago',     NULL )
           , ( 'Cartão NU Letícia',    30.72, 'pago',     NULL )
           , ( 'Cartão Carre4',         0.00, 'pago',     NULL )
           , ( 'Cartão Saveg',          0.00, 'pago',     NULL )
           , ( 'Cartão Ponto (Let)',   15.00, 'pago',     NULL )
           , ( 'Cartão Ponto (Tul)',   15.00, 'pago',     NULL )
           , ( 'Cartão Passaí',        16.65, 'pago',     NULL )
           , ( 'Cartão ITAU (Let)',     0.00, 'pago',     NULL )
           , ( 'Energia (CPFL)',      267.74, 'pago',     NULL )
           , ( 'FIES',                258.29, 'pago',     111 )
           , ( 'Dentista',            100.00, 'pago',     NULL )
           , ( 'Internet',            118.00, 'pendente', NULL )
           , ( 'Empréstimo NU',       360.98, 'pago',     12 )
           , ( 'IPVA',                531.62, 'pago',     5 )
       ) AS X (nome, valor, status, parcela)
  JOIN public.contas C ON C.nome = X.nome
 WHERE 1 = 1;

-- ---------------------------------------------------------------------
-- Quem pode acessar: TROQUE pelos e-mails que vocês vão usar no login
-- ---------------------------------------------------------------------
INSERT INTO public.membros (email, nome)
VALUES
     ( 'SEU_EMAIL_AQUI',     'Tulio' )
   , ( 'EMAIL_ESPOSA_AQUI',  'Letícia' );
