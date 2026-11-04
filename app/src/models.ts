/**
 * models.ts
 * 
 * Ficheiro Unificado de Modelos de Domínio do FarmaLocal Pemba
 * Universidade Católica de Moçambique (UCM FGTI)
 * Autor: Júnior Dicson Baulene - 706240111 | Orientador: Celso de Sousa
 * 
 * Contém a especificação completa de todas as entidades e modelos do sistema:
 * - PharmacyModel (Farmácias parceiras e georreferenciamento físico GPS)
 * - MedicineStockModel (Estoque de medicamentos com regra anti-duplicidade)
 * - AdminModel (Administração e credenciamento de farmácias)
 */

export * from './models/PharmacyModel';
export * from './models/MedicineStockModel';
export * from './models/AdminModel';
export * from './types';
