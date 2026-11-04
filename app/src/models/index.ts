/**
 * models/index.ts
 * 
 * Centralizador de Modelos de Domínio do FarmaLocal Pemba
 * Universidade Católica de Moçambique (UCM FGTI) - Práticas em TI 2026
 * 
 * Este ficheiro unifica e expõe formalmente todos os models do sistema:
 * 1. PharmacyModel: Entidade Farmácia (credenciamento, dados físicos GPS, contacto, horários).
 * 2. MedicineStockModel: Entidade Estoque de Medicamentos (regra anti-duplicidade,
 *    baixa de estoque rápida, pesquisa com filtro RN-01 de disponibilidade).
 * 3. AdminModel: Entidade Administrador (autenticação segura e governança de farmácias).
 */

export * from './PharmacyModel';
export * from './MedicineStockModel';
export * from './AdminModel';
export * from '../types';
