-- ============================================================
-- Paris Dakar Agente — Script de Correção Completo
-- Execute no SQL Editor do Supabase Dashboard
-- Projeto: jjjvieragarzplulikbv (org RXfree)
-- ============================================================

-- ─── 1. Ver estrutura atual da tabela colaboradores ──────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'colaboradores'
ORDER BY ordinal_position;

-- ─── 2. Ver todos os colaboradores cadastrados ───────────────
SELECT id, nome, sobrenome, departamento, ativo, 
       LEFT(senha_hash, 20) || '...' AS senha_preview
FROM colaboradores;

-- ─── 3. Ver políticas RLS ativas ────────────────────────────
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('colaboradores', 'veiculos_bloqueados')
ORDER BY tablename, policyname;

-- ─── 4. Habilitar RLS (idempotente) ─────────────────────────
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_bloqueados ENABLE ROW LEVEL SECURITY;

-- ─── 5. Remover policies antigas ────────────────────────────
DROP POLICY IF EXISTS "anon_select_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_select_veiculos_bloqueados" ON public.veiculos_bloqueados;
DROP POLICY IF EXISTS "Permitir leitura anon colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Permitir leitura anon veiculos_bloqueados" ON public.veiculos_bloqueados;

-- ─── 6. Criar policies de leitura para anon ─────────────────
CREATE POLICY "anon_select_colaboradores"
  ON public.colaboradores
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_veiculos_bloqueados"
  ON public.veiculos_bloqueados
  FOR SELECT
  TO anon
  USING (true);

-- ─── 7. CADASTRO DO USUÁRIO ──────────────────────────────────
-- ATENÇÃO: Substitua os valores abaixo com os dados reais do usuário
-- nome: primeiro nome em minúsculo (ex: joao)
-- sobrenome: sobrenome em minúsculo (ex: silva) 
-- senha: a senha desejada - já está em SHA-256 abaixo
-- Para gerar novo hash SHA-256: use https://emn178.github.io/online-tools/sha256.html

-- Hash SHA-256 da senha '2026' (senha padrão dos outros usuários):
-- 158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab

-- Exemplos de hashes:
-- '2026'   => 158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab
-- '123456' => 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
-- 'paris'  => 1670f2e42fefa5044d59a65349e47c566009488fc57d7b4376dd5787b59e3c57

-- Para inserir novo usuário (ajuste nome/sobrenome/departamento):
INSERT INTO public.colaboradores (nome, sobrenome, departamento, ativo, senha_hash)
VALUES (
  'elieletro',                    -- nome em minúsculo
  'admin',                        -- sobrenome em minúsculo  
  'master',                       -- departamento
  1,                              -- ativo = 1
  '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'  -- senha: 2026
)
ON CONFLICT DO NOTHING;

-- ─── 8. Verificar estrutura de veiculos_bloqueados ───────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'veiculos_bloqueados'
ORDER BY ordinal_position;

-- ─── 9. Ver veículos bloqueados ─────────────────────────────
SELECT id, placa, modelo_descricao, status_final, bloqueado_em
FROM veiculos_bloqueados
ORDER BY bloqueado_em DESC
LIMIT 10;

-- ─── 10. Confirmar politicas criadas ────────────────────────
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('colaboradores', 'veiculos_bloqueados');
