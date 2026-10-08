export interface Pharmacy {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  senha_hash: string;
  provincia: string;
  cidade: string;
  bairro: string;
  endereco_detalhado?: string;
  horario_funcionamento: string;
  latitude: number;
  longitude: number;
  criado_em: string;
  atualizado_em: string;
}

export interface MedicineStock {
  id: string;
  farmacia_id: string;
  nome_comercial: string;
  principio_ativo: string;
  dosagem: string; // Ex: '500mg - 20 Comprimidos', 'Xarope 120ml'
  quantidade_stock: number;
  preco: number; // Em Meticais (MZN)
  criado_em: string;
  atualizado_em: string;
}

export interface SearchResultItem {
  medicamento: MedicineStock;
  farmacia: {
    id: string;
    nome: string;
    telefone: string;
    bairro: string;
    cidade: string;
    provincia: string;
    horario_funcionamento: string;
    latitude: number;
    longitude: number;
  };
  distancia_km: number;
  distancia_formatada: string;
}

export interface SessionData {
  farmaciaId: string;
  nome: string;
  email: string;
}

export interface AdminSession {
  adminId: string;
  nome: string;
  email: string;
  role: 'ADMINISTRADOR';
}

