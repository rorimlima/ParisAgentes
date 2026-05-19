-- ============================================================
-- Paris Dakar Agente PWA — Setup RLS Policies
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ─── 1. Habilitar RLS nas tabelas (idempotente) ─────────────
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_bloqueados ENABLE ROW LEVEL SECURITY;

-- ─── 2. Remover policies antigas (evitar duplicatas) ────────
DROP POLICY IF EXISTS "anon_select_colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "anon_select_veiculos_bloqueados" ON public.veiculos_bloqueados;
DROP POLICY IF EXISTS "Permitir leitura anon colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Permitir leitura anon veiculos_bloqueados" ON public.veiculos_bloqueados;

-- ─── 3. Criar policies de leitura para o role anon ──────────
-- Colaboradores: permitir SELECT para autenticação via app
CREATE POLICY "anon_select_colaboradores"
  ON public.colaboradores
  FOR SELECT
  TO anon
  USING (true);

-- Veículos Bloqueados: permitir SELECT para visualização no app
CREATE POLICY "anon_select_veiculos_bloqueados"
  ON public.veiculos_bloqueados
  FOR SELECT
  TO anon
  USING (true);

-- ─── 4. Verificar se as policies foram criadas ─────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('colaboradores', 'veiculos_bloqueados')
ORDER BY tablename, policyname;
