/**
 * models/AdminModel.ts
 * 
 * Modelo de Domínio para a Entidade Administrador (Admin)
 * FarmaLocal Pemba - Universidade Católica de Moçambique (UCM FGTI)
 * 
 * Responsável por gerir a autenticação administrativa, verificação de credenciais
 * e privilégios para credenciamento e remoção de farmácias parceiras.
 */

import { DatabaseService } from '../lib/database';
import { AdminSession } from '../types';

export class AdminModel {
  public id: string;
  public nome: string;
  public email: string;
  public role: 'ADMINISTRADOR';

  constructor(data: { id: string; nome: string; email: string }) {
    this.id = data.id;
    this.nome = data.nome;
    this.email = data.email;
    this.role = 'ADMINISTRADOR';
  }

  /**
   * Valida as credenciais administrativas no Supabase ou no banco local
   */
  public static async authenticate(email: string, senhaPura: string): Promise<{ success: boolean; admin?: AdminSession }> {
    const db = DatabaseService.getInstance();
    const result = await db.validateAdmin(email, senhaPura);

    if (result.success && result.admin) {
      return {
        success: true,
        admin: {
          adminId: result.admin.id,
          nome: result.admin.nome,
          email: result.admin.email,
          role: 'ADMINISTRADOR'
        }
      };
    }

    return { success: false };
  }

  /**
   * Obtém a lista consolidada de farmácias com contagem de medicamentos cadastrados
   */
  public static getPharmaciesSummary(): Array<{
    farmacia: any;
    totalMedicamentos: number;
  }> {
    const db = DatabaseService.getInstance();
    return db.farmacias.map(farmacia => ({
      farmacia,
      totalMedicamentos: db.getMedicinesCountByPharmacy(farmacia.id)
    }));
  }
}
