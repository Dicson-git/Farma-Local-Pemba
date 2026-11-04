/**
 * models/PharmacyModel.ts
 * 
 * Modelo de Domínio para a Entidade Farmácia (Pharmacy)
 * FarmaLocal Pemba - Universidade Católica de Moçambique (UCM FGTI)
 * 
 * Responsável por gerir os dados cadastrais, credenciamento administrativo,
 * coordenadas físicas de alta precisão (GPS) e autenticação de farmácias.
 */

import bcrypt from 'bcryptjs';
import { DatabaseService } from '../lib/database';
import { Pharmacy } from '../types';

export class PharmacyModel implements Pharmacy {
  public id: string;
  public nome: string;
  public telefone: string;
  public email: string;
  public senha_hash: string;
  public provincia: string;
  public cidade: string;
  public bairro: string;
  public endereco_detalhado?: string;
  public horario_funcionamento: string;
  public latitude: number;
  public longitude: number;
  public criado_em: string;
  public atualizado_em: string;

  constructor(data: Pharmacy) {
    this.id = data.id;
    this.nome = data.nome;
    this.telefone = data.telefone;
    this.email = data.email;
    this.senha_hash = data.senha_hash;
    this.provincia = data.provincia || 'Cabo Delgado';
    this.cidade = data.cidade || 'Pemba';
    this.bairro = data.bairro;
    this.endereco_detalhado = data.endereco_detalhado;
    this.horario_funcionamento = data.horario_funcionamento;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.criado_em = data.criado_em;
    this.atualizado_em = data.atualizado_em;
  }

  /**
   * Retorna todas as farmácias credenciadas no sistema
   */
  public static getAll(): Pharmacy[] {
    const db = DatabaseService.getInstance();
    return db.farmacias.map(f => ({ ...f }));
  }

  /**
   * Localiza uma farmácia pelo seu identificador único (UUID)
   */
  public static findById(id: string): Pharmacy | undefined {
    const db = DatabaseService.getInstance();
    return db.findPharmacyById(id);
  }

  /**
   * Localiza uma farmácia pelo endereço de e-mail institucional
   */
  public static findByEmail(email: string): Pharmacy | undefined {
    const db = DatabaseService.getInstance();
    return db.findPharmacyByEmail(email);
  }

  /**
   * Cria e credencia uma nova farmácia no sistema (Exclusivo do Administrador)
   */
  public static async create(data: Omit<Pharmacy, 'id' | 'criado_em' | 'atualizado_em'>): Promise<Pharmacy> {
    const db = DatabaseService.getInstance();
    return await db.addPharmacy({
      ...data,
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      telefone: data.telefone.trim(),
      provincia: data.provincia?.trim() || 'Cabo Delgado',
      cidade: data.cidade?.trim() || 'Pemba',
      bairro: data.bairro.trim(),
      horario_funcionamento: data.horario_funcionamento?.trim() || '08h00 às 20h00',
      latitude: parseFloat(Number(data.latitude).toFixed(6)),
      longitude: parseFloat(Number(data.longitude).toFixed(6))
    });
  }

  /**
   * Atualiza dados de atendimento, contacto ou localização exata (GPS)
   */
  public static async update(id: string, updates: Partial<Pharmacy>): Promise<Pharmacy | null> {
    const db = DatabaseService.getInstance();
    return await db.updatePharmacy(id, updates);
  }

  /**
   * Remove a farmácia e todos os seus medicamentos associados em cascata
   */
  public static async delete(id: string): Promise<boolean> {
    const db = DatabaseService.getInstance();
    return await db.deletePharmacy(id);
  }

  /**
   * Valida a senha da farmácia comparando o texto puro com o hash Bcrypt
   */
  public static verifyPassword(senhaPura: string, hash: string): boolean {
    return bcrypt.compareSync(senhaPura, hash);
  }

  /**
   * Sanitiza o contacto telefónico para protocolo nativo de chamada tel:
   */
  public static sanitizePhoneForCall(telefone: string): string {
    const limpo = telefone.replace(/[^\d+]/g, '');
    return limpo.startsWith('+') ? limpo : `+${limpo}`;
  }
}
