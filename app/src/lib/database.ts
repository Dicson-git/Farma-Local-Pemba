/**
 * lib/database.ts
 * 
 * Camada de Persistência Híbrida Write-Through:
 * - Primário: Supabase PostgreSQL Cloud (transacional e relacional)
 * - Cache / Contingência: Memória RAM de alta velocidade + Backup JSON em disco
 * 
 * Georreferenciamento de alta precisão em Pemba (Cabo Delgado, Moçambique).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Pharmacy, MedicineStock } from '../types';
import { 
  fetchAllFromSupabase, 
  persistPharmacy, 
  removePharmacy, 
  persistMedicine, 
  removeMedicine,
  findAdminInSupabase 
} from './persistence';
import { isSupabaseConfigured } from './supabase';

export class DatabaseService {
  private static instance: DatabaseService;
  private dbFilePath: string;
  private initialized: boolean = false;

  public farmacias: Pharmacy[] = [];
  public medicamentos: MedicineStock[] = [];

  private constructor() {
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'database.json');
    this.loadFromDiskOrSeed();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Inicialização com Hidratação do Supabase (Bootstrap da Aplicação)
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    console.log('[DB] Inicializando camada de persistência híbrida...');

    if (isSupabaseConfigured()) {
      try {
        const cloudData = await fetchAllFromSupabase();
        if (cloudData && cloudData.farmacias.length > 0) {
          this.farmacias = cloudData.farmacias;
          this.medicamentos = cloudData.medicamentos;
          this.saveToDisk();
          this.initialized = true;
          console.log(`[SUPABASE] ✅ Hidratação concluída: ${this.farmacias.length} farmácias e ${this.medicamentos.length} medicamentos carregados da nuvem.`);
          return;
        }
      } catch (err: any) {
        console.warn(`[SUPABASE] ⚠️ Falha na hidratação em nuvem: ${err.message}. Ativando contingência local.`);
      }
    } else {
      console.log('[DB] Supabase não configurado. Operando exclusivamente com base local.');
    }

    this.initialized = true;
  }

  private saveToDisk() {
    try {
      const data = {
        farmacias: this.farmacias,
        medicamentos: this.medicamentos,
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Erro ao persistir cache local em disco:', err);
    }
  }

  private loadFromDiskOrSeed() {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.farmacias) && data.farmacias.length > 0) {
          this.farmacias = data.farmacias;
          this.medicamentos = data.medicamentos || [];
          console.log(`[DB] Cache local carregado: ${this.farmacias.length} farmácias, ${this.medicamentos.length} medicamentos.`);
          return;
        }
      } catch (e) {
        console.warn('[DB] Cache local inválido. Gerando semente inicial...');
      }
    }

    this.seedInitialData();
  }

  public seedInitialData() {
    console.log('[DB] Gerando seed com farmácias georreferenciadas de Pemba...');

    const salt = bcrypt.genSaltSync(10);
    const senhaPadrao = bcrypt.hashSync('123456', salt);

    // Coordenadas Reais de Bairros de Pemba (Cabo Delgado):
    // Baixa/Centro: -12.9715, 40.5180
    // Natite: -12.9642, 40.5255
    // Alto Gingone: -12.9810, 40.5050
    // Cariacó: -12.9680, 40.5090

    this.farmacias = [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        nome: 'Farmácia Central de Pemba',
        telefone: '+258 84 321 0001',
        email: 'central@farmalocal.co.mz',
        senha_hash: senhaPadrao,
        provincia: 'Cabo Delgado',
        cidade: 'Pemba',
        bairro: 'Baixa / Centro',
        endereco_detalhado: 'Av. Eduardo Mondlane, Próximo ao Porto',
        horario_funcionamento: '07h30 às 21h00',
        latitude: -12.971500,
        longitude: 40.518000,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'a0000000-0000-0000-0000-000000000002',
        nome: 'Farmácia Comunitária Natite',
        telefone: '+258 82 987 0002',
        email: 'natite@farmalocal.co.mz',
        senha_hash: senhaPadrao,
        provincia: 'Cabo Delgado',
        cidade: 'Pemba',
        bairro: 'Natite',
        endereco_detalhado: 'Rua do Mercado de Natite, Parada Principal',
        horario_funcionamento: '08h00 às 20h00',
        latitude: -12.964200,
        longitude: 40.525500,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'a0000000-0000-0000-0000-000000000003',
        nome: 'Farmácia Vida & Saúde Gingone',
        telefone: '+258 86 555 0003',
        email: 'gingone@farmalocal.co.mz',
        senha_hash: senhaPadrao,
        provincia: 'Cabo Delgado',
        cidade: 'Pemba',
        bairro: 'Alto Gingone',
        endereco_detalhado: 'Rotunda do Alto Gingone, Estrada N1',
        horario_funcionamento: '08h00 às 22h00',
        latitude: -12.981000,
        longitude: 40.505000,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'a0000000-0000-0000-0000-000000000004',
        nome: 'Farmácia Esperança Cariacó',
        telefone: '+258 87 111 0004',
        email: 'cariaco@farmalocal.co.mz',
        senha_hash: senhaPadrao,
        provincia: 'Cabo Delgado',
        cidade: 'Pemba',
        bairro: 'Cariacó',
        endereco_detalhado: 'Av. 25 de Setembro, Campo de Futebol',
        horario_funcionamento: '08h00 às 20h30',
        latitude: -12.968000,
        longitude: 40.509000,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }
    ];

    this.medicamentos = [
      // Farmácia Central (Baixa)
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        farmacia_id: 'a0000000-0000-0000-0000-000000000001',
        nome_comercial: 'Paracetamol 500mg',
        principio_ativo: 'Paracetamol',
        dosagem: '500mg - Caixa c/ 20 Comprimidos',
        quantidade_stock: 45,
        preco: 60.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        farmacia_id: 'a0000000-0000-0000-0000-000000000001',
        nome_comercial: 'Amoxicilina 500mg',
        principio_ativo: 'Amoxicilina Tri-hidratada',
        dosagem: '500mg - Caixa c/ 21 Cápsulas',
        quantidade_stock: 18,
        preco: 220.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        farmacia_id: 'a0000000-0000-0000-0000-000000000001',
        nome_comercial: 'Coartem (Antimalárico)',
        principio_ativo: 'Arteméter + Lumefantrina',
        dosagem: '20/120mg - Cartela c/ 24 Comprimidos',
        quantidade_stock: 30,
        preco: 350.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Natite
      {
        id: 'b0000000-0000-0000-0000-000000000004',
        farmacia_id: 'a0000000-0000-0000-0000-000000000002',
        nome_comercial: 'Paracetamol 500mg',
        principio_ativo: 'Paracetamol',
        dosagem: '500mg - Blister c/ 10 Comprimidos',
        quantidade_stock: 12,
        preco: 35.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000005',
        farmacia_id: 'a0000000-0000-0000-0000-000000000002',
        nome_comercial: 'Coartem Pediátrico',
        principio_ativo: 'Arteméter + Lumefantrina',
        dosagem: '20/120mg - 6 Comprimidos Dispersíveis',
        quantidade_stock: 15,
        preco: 250.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Gingone
      {
        id: 'b0000000-0000-0000-0000-000000000006',
        farmacia_id: 'a0000000-0000-0000-0000-000000000003',
        nome_comercial: 'Paracetamol Xarope',
        principio_ativo: 'Paracetamol',
        dosagem: '120mg/5ml - Frasco 100ml',
        quantidade_stock: 14,
        preco: 95.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000007',
        farmacia_id: 'a0000000-0000-0000-0000-000000000003',
        nome_comercial: 'Omeprazol 20mg',
        principio_ativo: 'Omeprazol',
        dosagem: '20mg - Frasco c/ 28 Cápsulas',
        quantidade_stock: 8,
        preco: 190.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Cariacó (com stock 0 para validação de omissão RN-01)
      {
        id: 'b0000000-0000-0000-0000-000000000008',
        farmacia_id: 'a0000000-0000-0000-0000-000000000004',
        nome_comercial: 'Amoxicilina 500mg',
        principio_ativo: 'Amoxicilina',
        dosagem: '500mg - 20 Comprimidos',
        quantidade_stock: 0,
        preco: 210.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }
    ];

    this.saveToDisk();
  }

  // ============================================================================
  // MÉTODOS DE CONSULTA (Leitura em Cache de Alta Velocidade)
  // ============================================================================

  public getAllPharmacies(): Pharmacy[] {
    return [...this.farmacias];
  }

  public findPharmacyByEmail(email: string): Pharmacy | undefined {
    return this.farmacias.find(f => f.email.toLowerCase() === email.toLowerCase());
  }

  public findPharmacyById(id: string): Pharmacy | undefined {
    return this.farmacias.find(f => f.id === id);
  }

  public getMedicinesCountByPharmacy(farmaciaId: string): number {
    return this.medicamentos.filter(m => m.farmacia_id === farmaciaId).length;
  }

  public getMedicinesByPharmacy(farmaciaId: string): MedicineStock[] {
    return this.medicamentos.filter(m => m.farmacia_id === farmaciaId);
  }

  public searchAvailableMedicines(termo?: string): Array<{ medicamento: MedicineStock; farmacia: Pharmacy }> {
    const termoClean = (termo || '').trim().toLowerCase();

    return this.medicamentos
      .filter(m => {
        // Regra RN-01: Não exibir se quantidade_stock for <= 0
        if (m.quantidade_stock <= 0) return false;
        if (!termoClean) return true;

        const matchNome = m.nome_comercial.toLowerCase().includes(termoClean);
        const matchPrincipio = (m.principio_ativo || '').toLowerCase().includes(termoClean);
        return matchNome || matchPrincipio;
      })
      .map(medicamento => {
        const farmacia = this.farmacias.find(f => f.id === medicamento.farmacia_id)!;
        return { medicamento, farmacia };
      })
      .filter(item => Boolean(item.farmacia));
  }

  // ============================================================================
  // MÉTODOS DE ESCRITA WRITE-THROUGH (Supabase First -> Memória -> Disco)
  // ============================================================================

  public async addPharmacy(farmaciaData: Omit<Pharmacy, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Pharmacy> {
    const novaFarmacia: Pharmacy = {
      ...farmaciaData,
      id: crypto.randomUUID(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    // 1. Gravar primeiro no Supabase
    await persistPharmacy(novaFarmacia);

    // 2. Atualizar estado local
    this.farmacias.push(novaFarmacia);
    this.saveToDisk();

    return novaFarmacia;
  }

  public async updatePharmacy(id: string, updates: Partial<Pharmacy>): Promise<Pharmacy | null> {
    const farmacia = this.farmacias.find(f => f.id === id);
    if (!farmacia) return null;

    if (updates.nome !== undefined) farmacia.nome = updates.nome.trim();
    if (updates.telefone !== undefined) farmacia.telefone = updates.telefone.trim();
    if (updates.email !== undefined) farmacia.email = updates.email.trim().toLowerCase();
    if (updates.senha_hash !== undefined && updates.senha_hash.trim()) farmacia.senha_hash = updates.senha_hash;
    if (updates.provincia !== undefined) farmacia.provincia = updates.provincia.trim();
    if (updates.cidade !== undefined) farmacia.cidade = updates.cidade.trim();
    if (updates.bairro !== undefined) farmacia.bairro = updates.bairro.trim();
    if (updates.endereco_detalhado !== undefined) farmacia.endereco_detalhado = updates.endereco_detalhado.trim();
    if (updates.horario_funcionamento !== undefined) farmacia.horario_funcionamento = updates.horario_funcionamento.trim();
    if (updates.latitude !== undefined && !isNaN(updates.latitude)) farmacia.latitude = parseFloat(updates.latitude.toFixed(6));
    if (updates.longitude !== undefined && !isNaN(updates.longitude)) farmacia.longitude = parseFloat(updates.longitude.toFixed(6));
    farmacia.atualizado_em = new Date().toISOString();

    // 1. Gravar atualização no Supabase
    await persistPharmacy(farmacia);

    // 2. Atualizar cache em disco
    this.saveToDisk();

    return farmacia;
  }

  public async deletePharmacy(id: string): Promise<boolean> {
    const idx = this.farmacias.findIndex(f => f.id === id);
    if (idx === -1) return false;

    // 1. Remover do Supabase (o Postgres cascateia para medicine_stocks)
    await removePharmacy(id);

    // 2. Atualizar coleções locais
    this.farmacias.splice(idx, 1);
    this.medicamentos = this.medicamentos.filter(m => m.farmacia_id !== id);
    this.saveToDisk();

    return true;
  }

  public async addMedicine(medicineData: Omit<MedicineStock, 'id' | 'criado_em' | 'atualizado_em'>): Promise<MedicineStock> {
    const nomeLimpo = medicineData.nome_comercial.trim().toLowerCase();
    const duplicado = this.medicamentos.find(
      m => m.farmacia_id === medicineData.farmacia_id && m.nome_comercial.trim().toLowerCase() === nomeLimpo
    );

    if (duplicado) {
      throw new Error(`MEDICINE_NAME_DUPLICATED: Já existe um medicamento com o nome comercial '${medicineData.nome_comercial.trim()}' no estoque desta farmácia.`);
    }

    const novoMedicamento: MedicineStock = {
      ...medicineData,
      id: crypto.randomUUID(),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    // 1. Gravar primeiro no Supabase
    await persistMedicine(novoMedicamento);

    // 2. Atualizar estado local
    this.medicamentos.push(novoMedicamento);
    this.saveToDisk();

    return novoMedicamento;
  }

  public async updateMedicineStock(id: string, farmaciaId: string, updates: Partial<MedicineStock>): Promise<MedicineStock | null> {
    const item = this.medicamentos.find(m => m.id === id && m.farmacia_id === farmaciaId);
    if (!item) return null;

    if (updates.nome_comercial !== undefined) item.nome_comercial = updates.nome_comercial.trim();
    if (updates.principio_ativo !== undefined) item.principio_ativo = updates.principio_ativo.trim();
    if (updates.dosagem !== undefined) item.dosagem = updates.dosagem.trim();
    if (updates.quantidade_stock !== undefined) {
      item.quantidade_stock = Math.max(0, updates.quantidade_stock);
    }
    if (updates.preco !== undefined) {
      item.preco = Math.max(0, updates.preco);
    }
    item.atualizado_em = new Date().toISOString();

    // 1. Gravar no Supabase
    await persistMedicine(item);

    // 2. Atualizar cache em disco
    this.saveToDisk();

    return item;
  }

  public async decrementMedicineStock(id: string, farmaciaId: string, amount: number = 1): Promise<MedicineStock | null> {
    const item = this.medicamentos.find(m => m.id === id && m.farmacia_id === farmaciaId);
    if (!item) return null;

    item.quantidade_stock = Math.max(0, item.quantidade_stock - amount);
    item.atualizado_em = new Date().toISOString();

    // 1. Gravar no Supabase
    await persistMedicine(item);

    // 2. Atualizar cache em disco
    this.saveToDisk();

    return item;
  }

  public async deleteMedicine(id: string, farmaciaId: string): Promise<boolean> {
    const idx = this.medicamentos.findIndex(m => m.id === id && m.farmacia_id === farmaciaId);
    if (idx >= 0) {
      // 1. Remover do Supabase
      await removeMedicine(id);

      // 2. Atualizar cache local
      this.medicamentos.splice(idx, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // ============================================================================
  // AUTENTICAÇÃO DO ADMINISTRADOR
  // ============================================================================

  public async validateAdmin(email: string, senha: string): Promise<{ success: boolean; admin?: { id: string; nome: string; email: string } }> {
    const adminEmail = 'admin@farmalocal.co.mz';
    const emailLimpo = email.trim().toLowerCase();

    // Validação primária no Supabase
    const adminCloud = await findAdminInSupabase(emailLimpo);
    if (adminCloud) {
      const match = bcrypt.compareSync(senha, adminCloud.senha_hash);
      if (match) {
        return {
          success: true,
          admin: {
            id: adminCloud.id,
            nome: adminCloud.nome,
            email: adminCloud.email
          }
        };
      }
      return { success: false };
    }

    // Fallback de contingência local
    if (emailLimpo === adminEmail && (senha === 'admin123' || senha === 'admin')) {
      return {
        success: true,
        admin: {
          id: 'admin-root',
          nome: 'Administrador do Sistema FarmaLocal',
          email: adminEmail
        }
      };
    }

    return { success: false };
  }

  // ============================================================================
  // SINCRONIZAÇÃO EM MASSA (Bulk Sync para o Painel Admin)
  // ============================================================================

  public async syncWithSupabase(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase não configurado no arquivo .env.'
      };
    }

    try {
      let fCount = 0;
      let mCount = 0;

      for (const f of this.farmacias) {
        const ok = await persistPharmacy(f);
        if (ok) fCount++;
      }

      for (const m of this.medicamentos) {
        const ok = await persistMedicine(m);
        if (ok) mCount++;
      }

      return {
        success: true,
        message: `Sincronização concluída: ${fCount} farmácias e ${mCount} medicamentos salvos no Supabase.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro na sincronização em massa: ${err.message}`
      };
    }
  }
}
