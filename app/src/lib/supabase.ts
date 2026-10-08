/**
 * lib/supabase.ts
 * 
 * Camada de Integração e Conectividade com o Supabase (PostgreSQL Cloud)
 * Preparado para produção com suporte a RLS, PostGIS e migrações ACID.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Verifica se as credenciais do Supabase foram definidas no ambiente (.env)
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseKey && 
    supabaseUrl.startsWith('https://') && 
    !supabaseUrl.includes('your-project')
  );
}

/**
 * Retorna o cliente Supabase instanciado (Singleton)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('[SUPABASE] Cliente inicializado com sucesso para o projeto:', supabaseUrl);
  }

  return supabaseInstance;
}

/**
 * Testa a conectividade com o banco de dados do Supabase
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.'
    };
  }

  try {
    const { error } = await client.from('pharmacies').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Falha na consulta ao Supabase: ${error.message} (Código: ${error.code})`
      };
    }
    return {
      connected: true,
      message: 'Conexão com o Supabase estabelecida com sucesso!'
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Erro de conexão: ${err.message}`
    };
  }
}
