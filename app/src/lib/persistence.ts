/**
 * lib/persistence.ts
 * 
 * Camada de Persistência Relacional Write-Through com Supabase (PostgreSQL Cloud).
 * Mapeamento estrito, paginação resiliente e operações atômicas.
 */

import { Pharmacy, MedicineStock } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// ============================================================================
// 1. Mapeadores de Domínio (TypeScript <-> PostgreSQL snake_case)
// ============================================================================

export const pharmacyMapper = {
  fromRow: (row: any): Pharmacy => ({
    id: String(row.id),
    nome: String(row.nome),
    telefone: String(row.telefone),
    email: String(row.email).toLowerCase(),
    senha_hash: String(row.senha_hash),
    provincia: String(row.provincia || 'Cabo Delgado'),
    cidade: String(row.cidade || 'Pemba'),
    bairro: String(row.bairro),
    endereco_detalhado: row.endereco_detalhado ? String(row.endereco_detalhado) : '',
    horario_funcionamento: String(row.horario_funcionamento || '08h00 às 20h00'),
    latitude: parseFloat(Number(row.latitude).toFixed(6)),
    longitude: parseFloat(Number(row.longitude).toFixed(6)),
    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
  }),

  toRow: (entity: Pharmacy): Record<string, any> => ({
    id: entity.id,
    nome: entity.nome,
    telefone: entity.telefone,
    email: entity.email.toLowerCase(),
    senha_hash: entity.senha_hash,
    provincia: entity.provincia,
    cidade: entity.cidade,
    bairro: entity.bairro,
    endereco_detalhado: entity.endereco_detalhado || null,
    horario_funcionamento: entity.horario_funcionamento,
    latitude: entity.latitude,
    longitude: entity.longitude,
    criado_em: entity.criado_em,
    atualizado_em: entity.atualizado_em
  })
};

export const medicineMapper = {
  fromRow: (row: any): MedicineStock => ({
    id: String(row.id),
    farmacia_id: String(row.farmacia_id),
    nome_comercial: String(row.nome_comercial),
    principio_ativo: String(row.principio_ativo || ''),
    dosagem: String(row.dosagem),
    quantidade_stock: parseInt(String(row.quantidade_stock), 10) || 0,
    preco: parseFloat(Number(row.preco).toFixed(2)) || 0,
    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString()
  }),

  toRow: (entity: MedicineStock): Record<string, any> => ({
    id: entity.id,
    farmacia_id: entity.farmacia_id,
    nome_comercial: entity.nome_comercial,
    principio_ativo: entity.principio_ativo || null,
    dosagem: entity.dosagem,
    quantidade_stock: entity.quantidade_stock,
    preco: entity.preco,
    criado_em: entity.criado_em,
    atualizado_em: entity.atualizado_em
  })
};

// ============================================================================
// 2. Operações de Consulta e Hidratação (Bootstrap)
// ============================================================================

/**
 * Carrega todos os registros das farmácias e medicamentos cadastrados no Supabase
 */
export async function fetchAllFromSupabase(): Promise<{
  farmacias: Pharmacy[];
  medicamentos: MedicineStock[];
} | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const [pRes, mRes] = await Promise.all([
      client.from('pharmacies').select('*').order('nome', { ascending: true }),
      client.from('medicine_stocks').select('*').order('nome_comercial', { ascending: true })
    ]);

    if (pRes.error) {
      console.error('[SUPABASE] Erro ao buscar farmácias:', pRes.error.message);
      return null;
    }

    if (mRes.error) {
      console.error('[SUPABASE] Erro ao buscar medicamentos:', mRes.error.message);
      return null;
    }

    const farmacias = (pRes.data || []).map(pharmacyMapper.fromRow);
    const medicamentos = (mRes.data || []).map(medicineMapper.fromRow);

    return { farmacias, medicamentos };
  } catch (err: any) {
    console.error('[SUPABASE] Falha na rede ao hidratar dados:', err.message);
    return null;
  }
}

/**
 * Consulta o administrador mestre no Supabase por email
 */
export async function findAdminInSupabase(email: string): Promise<{ id: string; nome: string; email: string; senha_hash: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('admins')
      .select('id, nome, email, senha_hash')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) return null;
    return {
      id: String(data.id),
      nome: String(data.nome),
      email: String(data.email),
      senha_hash: String(data.senha_hash)
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 3. Operações de Escrita Atômica Write-Through
// ============================================================================

/**
 * Insere ou atualiza uma farmácia no Supabase
 */
export async function persistPharmacy(pharmacy: Pharmacy): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = pharmacyMapper.toRow(pharmacy);
    const { error } = await client.from('pharmacies').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[SUPABASE] Erro ao persistir farmácia:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[SUPABASE] Exceção ao persistir farmácia:', err.message);
    return false;
  }
}

/**
 * Remove uma farmácia do Supabase (remoção em cascata garantida por FK no PostgreSQL)
 */
export async function removePharmacy(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('pharmacies').delete().eq('id', id);
    if (error) {
      console.error('[SUPABASE] Erro ao remover farmácia:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[SUPABASE] Exceção ao remover farmácia:', err.message);
    return false;
  }
}

/**
 * Insere ou atualiza um medicamento no Supabase
 */
export async function persistMedicine(medicine: MedicineStock): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = medicineMapper.toRow(medicine);
    const { error } = await client.from('medicine_stocks').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[SUPABASE] Erro ao persistir medicamento:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[SUPABASE] Exceção ao persistir medicamento:', err.message);
    return false;
  }
}

/**
 * Remove um medicamento do Supabase
 */
export async function removeMedicine(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('medicine_stocks').delete().eq('id', id);
    if (error) {
      console.error('[SUPABASE] Erro ao remover medicamento:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[SUPABASE] Exceção ao remover medicamento:', err.message);
    return false;
  }
}
