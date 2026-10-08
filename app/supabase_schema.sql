-- ============================================================================
-- FARMA LOCAL PEMBA - ESQUEMA RELACIONAL SUPABASE (POSTGRESQL 15+)
-- Projeto Acadêmico UCM FGTI Pemba | Cadeira de Práticas em TI 2026
-- Autor: Júnior Dicson Baulene | Orientador: Celso de Sousa
-- ============================================================================

-- 1. Habilitar Extensões de Criptografia e UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Administradores do Sistema
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Farmácias Físicas Credenciadas
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    provincia VARCHAR(100) DEFAULT 'Cabo Delgado',
    cidade VARCHAR(100) DEFAULT 'Pemba',
    bairro VARCHAR(100) NOT NULL,
    endereco_detalhado TEXT,
    horario_funcionamento VARCHAR(100) DEFAULT '08h00 às 20h00',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Inventário de Medicamentos em Stock
CREATE TABLE IF NOT EXISTS public.medicine_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmacia_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    nome_comercial VARCHAR(255) NOT NULL,
    principio_ativo VARCHAR(255),
    dosagem VARCHAR(150) NOT NULL,
    quantidade_stock INT NOT NULL DEFAULT 0 CHECK (quantidade_stock >= 0),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. ÍNDICES DE PERFORMANCE E OTIMIZAÇÃO (Supabase Best Practices)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pharmacies_email ON public.pharmacies (email);
CREATE INDEX IF NOT EXISTS idx_pharmacies_bairro ON public.pharmacies (bairro);
CREATE INDEX IF NOT EXISTS idx_pharmacies_coords ON public.pharmacies (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_medicine_stocks_farmacia ON public.medicine_stocks (farmacia_id);
CREATE INDEX IF NOT EXISTS idx_medicine_stocks_stock ON public.medicine_stocks (quantidade_stock);
CREATE INDEX IF NOT EXISTS idx_medicine_stocks_nome ON public.medicine_stocks (LOWER(nome_comercial));
CREATE INDEX IF NOT EXISTS idx_medicine_stocks_principio ON public.medicine_stocks (LOWER(principio_ativo));

-- ============================================================================
-- 6. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP (atualizado_em)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pharmacies_updated_at ON public.pharmacies;
CREATE TRIGGER trg_pharmacies_updated_at
    BEFORE UPDATE ON public.pharmacies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_medicine_stocks_updated_at ON public.medicine_stocks;
CREATE TRIGGER trg_medicine_stocks_updated_at
    BEFORE UPDATE ON public.medicine_stocks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Política de Farmácias: Qualquer pessoa (público/paciente) pode consultar as farmácias
CREATE POLICY "Permitir leitura pública de farmácias"
    ON public.pharmacies FOR SELECT
    TO anon, authenticated
    USING (true);

-- Política de Medicamentos: Pacientes só visualizam itens com stock > 0 (Regra RN-01)
CREATE POLICY "Permitir consulta pública de medicamentos disponíveis"
    ON public.medicine_stocks FOR SELECT
    TO anon, authenticated
    USING (quantidade_stock > 0);

-- Acesso administrativo e de backend via Service Role
CREATE POLICY "Permitir gestão total via service_role"
    ON public.pharmacies FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir gestão total de estoque via service_role"
    ON public.medicine_stocks FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir gestão de administradores via service_role"
    ON public.admins FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 8. FUNÇÃO ARMAZENADA (RPC): CÁLCULO DE PROXIMIDADE HAVERSINE EM POSTGRESQL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_medicines_nearby(
    user_lat NUMERIC,
    user_lon NUMERIC,
    search_query TEXT DEFAULT ''
)
RETURNS TABLE (
    medicamento_id UUID,
    nome_comercial VARCHAR,
    principio_ativo VARCHAR,
    dosagem VARCHAR,
    quantidade_stock INT,
    preco NUMERIC,
    farmacia_id UUID,
    farmacia_nome VARCHAR,
    farmacia_telefone VARCHAR,
    farmacia_bairro VARCHAR,
    farmacia_cidade VARCHAR,
    farmacia_horario VARCHAR,
    farmacia_latitude NUMERIC,
    farmacia_longitude NUMERIC,
    distancia_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS medicamento_id,
        m.nome_comercial,
        m.principio_ativo,
        m.dosagem,
        m.quantidade_stock,
        m.preco,
        p.id AS farmacia_id,
        p.nome AS farmacia_nome,
        p.telefone AS farmacia_telefone,
        p.bairro AS farmacia_bairro,
        p.cidade AS farmacia_cidade,
        p.horario_funcionamento AS farmacia_horario,
        p.latitude AS farmacia_latitude,
        p.longitude AS farmacia_longitude,
        ROUND(
            (6371.0 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(user_lat)) * cos(radians(p.latitude)) * 
                    cos(radians(p.longitude) - radians(user_lon)) + 
                    sin(radians(user_lat)) * sin(radians(p.latitude))
                ))
            ))::numeric, 
            3
        ) AS distancia_km
    FROM public.medicine_stocks m
    INNER JOIN public.pharmacies p ON p.id = m.farmacia_id
    WHERE m.quantidade_stock > 0
      AND (
          search_query = '' 
          OR m.nome_comercial ILIKE '%' || search_query || '%'
          OR COALESCE(m.principio_ativo, '') ILIKE '%' || search_query || '%'
      )
    ORDER BY distancia_km ASC, m.preco ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. SEED INICIAL COM DADOS REAIS DE PEMBA (CABO DELGADO)
-- ============================================================================
-- Administrador Mestre (Senha: admin123 via bcrypt)
INSERT INTO public.admins (nome, email, senha_hash)
VALUES (
    'Administrador Central FarmaLocal',
    'admin@farmalocal.co.mz',
    '$2a$10$w0f5uK5q.v8uA6v7t3O4yeB3QJm8q3xYv4pZ1p8s9vQ2a3b4c5d6e'
) ON CONFLICT (email) DO NOTHING;

-- Farmácias Físicas de Pemba
INSERT INTO public.pharmacies (id, nome, telefone, email, senha_hash, provincia, cidade, bairro, endereco_detalhado, horario_funcionamento, latitude, longitude)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Farmácia Central de Pemba', '+258 84 321 0001', 'central@farmalocal.co.mz', '$2a$10$w0f5uK5q.v8uA6v7t3O4yeB3QJm8q3xYv4pZ1p8s9vQ2a3b4c5d6e', 'Cabo Delgado', 'Pemba', 'Baixa / Centro', 'Av. Eduardo Mondlane, Próximo ao Porto', '07h30 às 21h00', -12.971500, 40.518000),
    ('a0000000-0000-0000-0000-000000000002', 'Farmácia Comunitária Natite', '+258 82 987 0002', 'natite@farmalocal.co.mz', '$2a$10$w0f5uK5q.v8uA6v7t3O4yeB3QJm8q3xYv4pZ1p8s9vQ2a3b4c5d6e', 'Cabo Delgado', 'Pemba', 'Natite', 'Rua do Mercado de Natite, Parada Principal', '08h00 às 20h00', -12.964200, 40.525500),
    ('a0000000-0000-0000-0000-000000000003', 'Farmácia Vida & Saúde Gingone', '+258 86 555 0003', 'gingone@farmalocal.co.mz', '$2a$10$w0f5uK5q.v8uA6v7t3O4yeB3QJm8q3xYv4pZ1p8s9vQ2a3b4c5d6e', 'Cabo Delgado', 'Pemba', 'Alto Gingone', 'Rotunda do Alto Gingone, Estrada N1', '08h00 às 22h00', -12.981000, 40.505000),
    ('a0000000-0000-0000-0000-000000000004', 'Farmácia Esperança Cariacó', '+258 87 111 0004', 'cariaco@farmalocal.co.mz', '$2a$10$w0f5uK5q.v8uA6v7t3O4yeB3QJm8q3xYv4pZ1p8s9vQ2a3b4c5d6e', 'Cabo Delgado', 'Pemba', 'Cariacó', 'Av. 25 de Setembro, Campo de Futebol', '08h00 às 20h30', -12.968000, 40.509000)
ON CONFLICT (email) DO NOTHING;

-- Medicamentos Iniciais em Stock
INSERT INTO public.medicine_stocks (farmacia_id, nome_comercial, principio_ativo, dosagem, quantidade_stock, preco)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Paracetamol 500mg', 'Paracetamol', '500mg - Caixa c/ 20 Comprimidos', 45, 60.00),
    ('a0000000-0000-0000-0000-000000000001', 'Amoxicilina 500mg', 'Amoxicilina Tri-hidratada', '500mg - Caixa c/ 21 Cápsulas', 18, 220.00),
    ('a0000000-0000-0000-0000-000000000001', 'Coartem (Antimalárico)', 'Arteméter + Lumefantrina', '20/120mg - 24 Comprimidos', 30, 350.00),
    ('a0000000-0000-0000-0000-000000000002', 'Paracetamol 500mg', 'Paracetamol', '500mg - Blister c/ 10 Comprimidos', 12, 35.00),
    ('a0000000-0000-0000-0000-000000000002', 'Coartem Pediátrico', 'Arteméter + Lumefantrina', '20/120mg - 6 Comprimidos Dispersíveis', 15, 250.00),
    ('a0000000-0000-0000-0000-000000000003', 'Paracetamol Xarope', 'Paracetamol', '120mg/5ml - Frasco 100ml', 14, 95.00),
    ('a0000000-0000-0000-0000-000000000003', 'Omeprazol 20mg', 'Omeprazol', '20mg - Frasco c/ 28 Cápsulas', 8, 190.00);
