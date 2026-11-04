/**
 * models/MedicineStockModel.ts
 * 
 * Modelo de Domínio para a Entidade Estoque de Medicamentos (MedicineStock)
 * FarmaLocal Pemba - Universidade Católica de Moçambique (UCM FGTI)
 * 
 * REGRA CRÍTICA DE INTEGRIDADE (ANTI-DUPLICIDADE):
 * O sistema NÃO permite o cadastramento de medicamentos com NOMES IGUAIS
 * ('nome_comercial') dentro da mesma farmácia.
 * 
 * Justificativa Farmacêutica e de Negócio:
 * 1. Prevenção de duplicidade e inconsistência no controle de inventário da farmácia.
 * 2. Evita divergências de preço e controle de validade para o mesmo fármaco no mesmo estabelecimento.
 * 3. Se uma farmácia já possui o medicamento cadastrado, deve atualizar a quantidade em estoque
 *    ou o preço do item existente através do recurso de edição, em vez de criar um registro duplicado.
 * 4. Farmácias distintas podem comercializar o mesmo medicamento, porém cada farmácia possui apenas
 *    um registro exclusivo por nome comercial.
 */

import { DatabaseService } from '../lib/database';
import { MedicineStock, Pharmacy } from '../types';

export class MedicineStockModel implements MedicineStock {
  public id: string;
  public farmacia_id: string;
  public nome_comercial: string;
  public principio_ativo: string;
  public dosagem: string;
  public quantidade_stock: number;
  public preco: number;
  public criado_em: string;
  public atualizado_em: string;

  constructor(data: MedicineStock) {
    this.id = data.id;
    this.farmacia_id = data.farmacia_id;
    this.nome_comercial = data.nome_comercial;
    this.principio_ativo = data.principio_ativo || '';
    this.dosagem = data.dosagem;
    this.quantidade_stock = data.quantidade_stock;
    this.preco = data.preco;
    this.criado_em = data.criado_em;
    this.atualizado_em = data.atualizado_em;
  }

  /**
   * Retorna todos os medicamentos registrados no sistema
   */
  public static getAll(): MedicineStock[] {
    const db = DatabaseService.getInstance();
    return db.medicamentos.map(m => ({ ...m }));
  }

  /**
   * Retorna os medicamentos cadastrados de uma farmácia específica
   */
  public static getByPharmacy(farmaciaId: string): MedicineStock[] {
    const db = DatabaseService.getInstance();
    return db.getMedicinesByPharmacy(farmaciaId);
  }

  /**
   * Localiza um medicamento pelo seu ID único
   */
  public static findById(id: string): MedicineStock | undefined {
    const db = DatabaseService.getInstance();
    return db.medicamentos.find(m => m.id === id);
  }

  /**
   * Verifica se já existe um medicamento com o mesmo nome comercial cadastrado na farmácia
   * (Comparação case-insensitive e com trim para evitar discrepâncias de espaçamento).
   */
  public static existsByNameInPharmacy(farmaciaId: string, nomeComercial: string): boolean {
    const db = DatabaseService.getInstance();
    const termo = nomeComercial.trim().toLowerCase();
    return db.medicamentos.some(
      m => m.farmacia_id === farmaciaId && m.nome_comercial.trim().toLowerCase() === termo
    );
  }

  /**
   * Localiza um medicamento específico pelo nome comercial dentro de uma farmácia
   */
  public static findByNameInPharmacy(farmaciaId: string, nomeComercial: string): MedicineStock | undefined {
    const db = DatabaseService.getInstance();
    const termo = nomeComercial.trim().toLowerCase();
    return db.medicamentos.find(
      m => m.farmacia_id === farmaciaId && m.nome_comercial.trim().toLowerCase() === termo
    );
  }

  /**
   * Cadastra um novo medicamento no estoque da farmácia.
   * 
   * REGRA ANTI-DUPLICIDADE:
   * Bloqueia o cadastro caso já exista um medicamento com o mesmo nome comercial na farmácia.
   */
  public static async create(data: Omit<MedicineStock, 'id' | 'criado_em' | 'atualizado_em'>): Promise<MedicineStock> {
    const db = DatabaseService.getInstance();

    if (this.existsByNameInPharmacy(data.farmacia_id, data.nome_comercial)) {
      throw new Error(`MEDICINE_NAME_DUPLICATED: Já existe um medicamento com o nome comercial '${data.nome_comercial.trim()}' no estoque desta farmácia.`);
    }

    const novo = await db.addMedicine({
      farmacia_id: data.farmacia_id,
      nome_comercial: data.nome_comercial.trim(),
      principio_ativo: (data.principio_ativo || '').trim(),
      dosagem: data.dosagem.trim(),
      quantidade_stock: Math.max(0, parseInt(String(data.quantidade_stock), 10) || 0),
      preco: Math.max(0, parseFloat(Number(data.preco).toFixed(2)) || 0)
    });

    return novo;
  }

  /**
   * Atualiza a quantidade em estoque e/ou preço de um medicamento específico
   */
  public static async update(
    id: string,
    farmaciaId: string,
    updates: Partial<MedicineStock>
  ): Promise<MedicineStock | null> {
    const db = DatabaseService.getInstance();

    if (updates.nome_comercial) {
      const nomeNovo = updates.nome_comercial.trim().toLowerCase();
      const colidente = db.medicamentos.find(
        m => m.farmacia_id === farmaciaId && m.id !== id && m.nome_comercial.trim().toLowerCase() === nomeNovo
      );
      if (colidente) {
        throw new Error(`MEDICINE_NAME_DUPLICATED: Outro item nesta farmácia já utiliza o nome comercial '${updates.nome_comercial.trim()}'.`);
      }
    }

    return await db.updateMedicineStock(id, farmaciaId, updates);
  }

  /**
   * Executa a baixa rápida de estoque (-1 unidade) no atendimento de balcão
   */
  public static async quickDecrement(
    id: string,
    farmaciaId: string,
    amount: number = 1
  ): Promise<MedicineStock | null> {
    const db = DatabaseService.getInstance();
    return await db.decrementMedicineStock(id, farmaciaId, amount);
  }

  /**
   * Remove um item específico do estoque da farmácia
   */
  public static async delete(id: string, farmaciaId: string): Promise<boolean> {
    const db = DatabaseService.getInstance();
    return await db.deleteMedicine(id, farmaciaId);
  }

  /**
   * Realiza a busca pública aplicando a Regra RN-01 (oculta stock <= 0)
   */
  public static searchAvailable(termo?: string): Array<{ medicamento: MedicineStock; farmacia: Pharmacy }> {
    const db = DatabaseService.getInstance();
    return db.searchAvailableMedicines(termo);
  }
}
