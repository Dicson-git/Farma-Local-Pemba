/**
 * lib/database.ts
 * 
 * Camada de Persistência Relacional com armazenamento em memória
 * e sincronização atômica em ficheiro JSON no disco.
 * 
 * Contém seed inicial realista com farmácias reais de Pemba (Cabo Delgado)
 * e coordenadas GPS georreferenciadas na cidade.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pharmacy, MedicineStock } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export class DatabaseService {
  private static instance: DatabaseService;
  private dbFilePath: string;

  public farmacias: Pharmacy[] = [];
  public medicamentos: MedicineStock[] = [];

  private constructor() {
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'database.json');
    this.loadOrSeed();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
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
      console.error('Erro ao persistir banco de dados em disco:', err);
    }
  }

  private loadOrSeed() {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        this.farmacias = data.farmacias || [];
        this.medicamentos = data.medicamentos || [];
        console.log(`[DB] Dados carregados do disco: ${this.farmacias.length} farmácias, ${this.medicamentos.length} medicamentos.`);
        return;
      } catch (e) {
        console.warn('[DB] Ficheiro existente inválido, gerando seed...');
      }
    }

    this.seedInitialData();
  }

  private seedInitialData() {
    console.log('[DB] Inicializando seed com farmácias e medicamentos em Pemba...');

    const salt = bcrypt.genSaltSync(10);
    const senhaPadrao = bcrypt.hashSync('123456', salt);

    // Coordenadas Reais de Bairros de Pemba (Cabo Delgado):
    // Centro/Baixa: -12.9715, 40.5180
    // Natite: -12.9642, 40.5255
    // Alto Gingone: -12.9810, 40.5050
    // Cariacó: -12.9680, 40.5090
    // Wimbi / Praia: -12.9960, 40.5520

    this.farmacias = [
      {
        id: 'farm-001',
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
        id: 'farm-002',
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
        id: 'farm-003',
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
        id: 'farm-004',
        nome: 'Farmácia Esperança Cariacó',
        telefone: '+258 87 111 0004',
        email: 'cariaco@farmalocal.co.mz',
        senha_hash: senhaPadrao,
        provincia: 'Cabo Delgado',
        cidade: 'Pemba',
        bairro: 'Cariacó',
        endereco_detalhado: 'Av. 25 de Setembro, junto ao Campo de Futebol',
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
        id: 'med-001',
        farmacia_id: 'farm-001',
        nome_comercial: 'Paracetamol 500mg',
        principio_ativo: 'Paracetamol',
        dosagem: '500mg - Caixa c/ 20 Comprimidos',
        quantidade_stock: 45,
        preco: 60.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-002',
        farmacia_id: 'farm-001',
        nome_comercial: 'Amoxicilina 500mg',
        principio_ativo: 'Amoxicilina Tri-hidratada',
        dosagem: '500mg - Caixa c/ 21 Cápsulas',
        quantidade_stock: 18,
        preco: 220.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-003',
        farmacia_id: 'farm-001',
        nome_comercial: 'Coartem (Antimalárico)',
        principio_ativo: 'Arteméter + Lumefantrina',
        dosagem: '20/120mg - Cartela c/ 24 Comprimidos',
        quantidade_stock: 30,
        preco: 350.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-004',
        farmacia_id: 'farm-001',
        nome_comercial: 'Ibuprofeno 400mg',
        principio_ativo: 'Ibuprofeno',
        dosagem: '400mg - Caixa c/ 20 Comprimidos',
        quantidade_stock: 25,
        preco: 110.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Natite
      {
        id: 'med-005',
        farmacia_id: 'farm-002',
        nome_comercial: 'Paracetamol 500mg',
        principio_ativo: 'Paracetamol',
        dosagem: '500mg - Blister c/ 10 Comprimidos',
        quantidade_stock: 12,
        preco: 35.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-006',
        farmacia_id: 'farm-002',
        nome_comercial: 'Amoxicilina Pediátrica',
        principio_ativo: 'Amoxicilina',
        dosagem: '250mg/5ml - Suspensão Oral 100ml',
        quantidade_stock: 6,
        preco: 180.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-007',
        farmacia_id: 'farm-002',
        nome_comercial: 'Coartem Pediátrico',
        principio_ativo: 'Arteméter + Lumefantrina',
        dosagem: '20/120mg - 6 Comprimidos Dispersíveis',
        quantidade_stock: 15,
        preco: 250.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-008',
        farmacia_id: 'farm-002',
        nome_comercial: 'SRO (Sais Reidratação Oral)',
        principio_ativo: 'Eletrólitos + Glicose',
        dosagem: 'Saqueta p/ 1 Litro de Água',
        quantidade_stock: 50,
        preco: 25.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Gingone
      {
        id: 'med-009',
        farmacia_id: 'farm-003',
        nome_comercial: 'Paracetamol Xarope',
        principio_ativo: 'Paracetamol',
        dosagem: '120mg/5ml - Frasco 100ml',
        quantidade_stock: 14,
        preco: 95.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-010',
        farmacia_id: 'farm-003',
        nome_comercial: 'Omeprazol 20mg',
        principio_ativo: 'Omeprazol',
        dosagem: '20mg - Frasco c/ 28 Cápsulas',
        quantidade_stock: 8,
        preco: 190.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-011',
        farmacia_id: 'farm-003',
        nome_comercial: 'Ciprofloxacina 500mg',
        principio_ativo: 'Cloridrato de Ciprofloxacina',
        dosagem: '500mg - Caixa c/ 10 Comprimidos',
        quantidade_stock: 5,
        preco: 210.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },

      // Farmácia Cariacó
      {
        id: 'med-012',
        farmacia_id: 'farm-004',
        nome_comercial: 'Paracetamol 500mg',
        principio_ativo: 'Paracetamol',
        dosagem: '500mg - Caixa c/ 20 Comprimidos',
        quantidade_stock: 3, // Stock baixo
        preco: 55.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'med-013',
        farmacia_id: 'farm-004',
        nome_comercial: 'Amoxicilina 500mg',
        principio_ativo: 'Amoxicilina',
        dosagem: '500mg - 20 Cápsulas',
        quantidade_stock: 0, // ESGOTADO (não deve aparecer para o paciente, RN-01)
        preco: 215.00,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }
    ];

    this.saveToDisk();
  }

  // --- MÉTODOS DE FARMÁCIAS E ADMINISTRAÇÃO ---
  public getAllPharmacies(): Pharmacy[] {
    return [...this.farmacias];
  }

  public findPharmacyByEmail(email: string): Pharmacy | undefined {
    return this.farmacias.find(f => f.email.toLowerCase() === email.toLowerCase());
  }

  public findPharmacyById(id: string): Pharmacy | undefined {
    return this.farmacias.find(f => f.id === id);
  }

  public addPharmacy(farmaciaData: Omit<Pharmacy, 'id' | 'criado_em' | 'atualizado_em'>): Pharmacy {
    const novaFarmacia: Pharmacy = {
      ...farmaciaData,
      id: 'farm-' + Date.now().toString(36),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };
    this.farmacias.push(novaFarmacia);
    this.saveToDisk();
    return novaFarmacia;
  }

  public updatePharmacy(id: string, updates: Partial<Pharmacy>): Pharmacy | null {
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

    this.saveToDisk();
    return farmacia;
  }

  public deletePharmacy(id: string): boolean {
    const idx = this.farmacias.findIndex(f => f.id === id);
    if (idx === -1) return false;

    // Remove farmácia
    this.farmacias.splice(idx, 1);

    // Remoção em cascata dos medicamentos pertencentes a esta farmácia
    this.medicamentos = this.medicamentos.filter(m => m.farmacia_id !== id);

    this.saveToDisk();
    return true;
  }

  public getMedicinesCountByPharmacy(farmaciaId: string): number {
    return this.medicamentos.filter(m => m.farmacia_id === farmaciaId).length;
  }

  public validateAdmin(email: string, senha: string): { success: boolean; admin?: { id: string; nome: string; email: string } } {
    const adminEmail = 'admin@farmalocal.co.mz';
    if (email.trim().toLowerCase() === adminEmail.toLowerCase() && (senha === 'admin123' || senha === 'admin')) {
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

  // --- MÉTODOS DE MEDICAMENTOS ---
  public getMedicinesByPharmacy(farmaciaId: string): MedicineStock[] {
    return this.medicamentos.filter(m => m.farmacia_id === farmaciaId);
  }

  public addMedicine(medicineData: Omit<MedicineStock, 'id' | 'criado_em' | 'atualizado_em'>): MedicineStock {
    const novoMedicamento: MedicineStock = {
      ...medicineData,
      id: 'med-' + Date.now().toString(36),
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };
    this.medicamentos.push(novoMedicamento);
    this.saveToDisk();
    return novoMedicamento;
  }

  public updateMedicineStock(id: string, farmaciaId: string, updates: Partial<MedicineStock>): MedicineStock | null {
    const item = this.medicamentos.find(m => m.id === id && m.farmacia_id === farmaciaId);
    if (!item) return null;

    if (updates.nome_comercial !== undefined) item.nome_comercial = updates.nome_comercial;
    if (updates.principio_ativo !== undefined) item.principio_ativo = updates.principio_ativo;
    if (updates.dosagem !== undefined) item.dosagem = updates.dosagem;
    if (updates.quantidade_stock !== undefined) {
      item.quantidade_stock = Math.max(0, updates.quantidade_stock);
    }
    if (updates.preco !== undefined) {
      item.preco = Math.max(0, updates.preco);
    }
    item.atualizado_em = new Date().toISOString();

    this.saveToDisk();
    return item;
  }

  public decrementMedicineStock(id: string, farmaciaId: string, amount: number = 1): MedicineStock | null {
    const item = this.medicamentos.find(m => m.id === id && m.farmacia_id === farmaciaId);
    if (!item) return null;

    item.quantidade_stock = Math.max(0, item.quantidade_stock - amount);
    item.atualizado_em = new Date().toISOString();
    this.saveToDisk();
    return item;
  }

  public deleteMedicine(id: string, farmaciaId: string): boolean {
    const idx = this.medicamentos.findIndex(m => m.id === id && m.farmacia_id === farmaciaId);
    if (idx >= 0) {
      this.medicamentos.splice(idx, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  /**
   * Busca medicamentos em estoque ativo (RN-01: quantidade_stock > 0)
   */
  public searchAvailableMedicines(termo?: string): Array<{ medicamento: MedicineStock; farmacia: Pharmacy }> {
    const termoClean = (termo || '').trim().toLowerCase();

    return this.medicamentos
      .filter(m => {
        // Regra RN-01: Não exibir se stock for 0
        if (m.quantidade_stock <= 0) return false;

        if (!termoClean) return true; // Retorna todos disponíveis se vazio

        const matchNome = m.nome_comercial.toLowerCase().includes(termoClean);
        const matchPrincipio = m.principio_ativo.toLowerCase().includes(termoClean);
        return matchNome || matchPrincipio;
      })
      .map(medicamento => {
        const farmacia = this.farmacias.find(f => f.id === medicamento.farmacia_id)!;
        return { medicamento, farmacia };
      })
      .filter(item => !!item.farmacia);
  }

  // --- MÉTODOS DE INTEGRAÇÃO SUPABASE ---
  public async syncWithSupabase(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase não configurado. Defina as variáveis no arquivo .env para habilitar sincronização em nuvem.'
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Falha ao inicializar cliente Supabase.' };
    }

    try {
      // 1. Sincronizar farmácias para o Supabase (Upsert)
      for (const f of this.farmacias) {
        await client.from('pharmacies').upsert({
          nome: f.nome,
          telefone: f.telefone,
          email: f.email,
          senha_hash: f.senha_hash,
          provincia: f.provincia,
          cidade: f.cidade,
          bairro: f.bairro,
          endereco_detalhado: f.endereco_detalhado,
          horario_funcionamento: f.horario_funcionamento,
          latitude: f.latitude,
          longitude: f.longitude,
          atualizado_em: f.atualizado_em
        }, { onConflict: 'email' });
      }

      console.log(`[SUPABASE] ${this.farmacias.length} farmácias sincronizadas com sucesso com o banco em nuvem.`);
      return {
        success: true,
        message: `Sincronização concluída: ${this.farmacias.length} farmácias sincronizadas no Supabase.`
      };
    } catch (err: any) {
      console.error('[SUPABASE] Erro durante a sincronização:', err);
      return {
        success: false,
        message: `Erro ao sincronizar com Supabase: ${err.message}`
      };
    }
  }
}

