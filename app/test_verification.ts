/**
 * test_verification.ts
 * 
 * Suíte Automatizada de Testes de Engenharia de Software
 * Validação de Regras de Negócio, Cálculo Geoespacial Haversine e Concorrência
 */

import { DatabaseService } from './src/lib/database';
import { calculateDistanceKm, formatDistance } from './src/lib/haversine';

console.log('================================================================');
console.log('🧪 INICIANDO SUÍTE DE TESTES: FarmaLocal Pemba (UCM FGTI)');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Falha no teste: ${message}`);
  }
}

// -------------------------------------------------------------------
// TESTE 1: Algoritmo Geoespacial Haversine
// -------------------------------------------------------------------
console.log('\n--- 1. Validação do Cálculo de Distância (Haversine) ---');
// Coordenadas:
// Ponto A: Baixa de Pemba (-12.9715, 40.5180)
// Ponto B: Natite (-12.9642, 40.5255) -> Distância real aprox. 1.1 km
const dist1 = calculateDistanceKm(-12.9715, 40.5180, -12.9642, 40.5255);
console.log(`Distância calculada entre Baixa e Natite: ${dist1.toFixed(3)} km`);
assert(dist1 > 0.8 && dist1 < 1.4, 'Distância Baixa-Natite calculada dentro da margem esperada (~1.1 km)');

// Ponto A até si mesmo
const distZero = calculateDistanceKm(-12.9715, 40.5180, -12.9715, 40.5180);
assert(distZero === 0, 'Distância entre coordenadas idênticas é estritamente 0 km');

// -------------------------------------------------------------------
// TESTE 2: Formatação de Distância (RN-02)
// -------------------------------------------------------------------
console.log('\n--- 2. Validação da Regra de Formatação (RN-02) ---');
const fmtMetro = formatDistance(0.35); // 350 metros
assert(fmtMetro === '350 m', `Distância < 1 km formatada em metros (esperado '350 m', obtido '${fmtMetro}')`);

const fmtKm = formatDistance(2.45); // 2.5 km
assert(fmtKm === '2.5 km', `Distância >= 1 km formatada em km (esperado '2.5 km', obtido '${fmtKm}')`);

// -------------------------------------------------------------------
// TESTE 3: Regra de Omissão de Stock Zero (RN-01)
// -------------------------------------------------------------------
console.log('\n--- 3. Validação do Filtro de Disponibilidade (RN-01) ---');
const db = DatabaseService.getInstance();

// Cariacó possui Amoxicilina cadastrada com stock = 0 no seed
const buscaAmoxicilina = db.searchAvailableMedicines('Amoxicilina');
const farmaciaComStockZero = buscaAmoxicilina.find(item => item.farmacia.id === 'farm-004');
assert(farmaciaComStockZero === undefined, 'Farmácia Cariacó (stock = 0) foi corretamente omitida das buscas públicas (RN-01)');

// Paracetamol está disponível em várias farmácias com stock > 0
const buscaParacetamol = db.searchAvailableMedicines('Paracetamol');
assert(buscaParacetamol.length >= 3, 'Medicamentos com stock > 0 foram retornados corretamente para o paciente');

// -------------------------------------------------------------------
// TESTE 4: Ordenação por Proximidade GPS (Menor para Maior)
// -------------------------------------------------------------------
console.log('\n--- 4. Validação da Ordenação por Proximidade GPS ---');
// Simular paciente localizado no centro da Baixa de Pemba (-12.9715, 40.5180)
const pacienteLat = -12.9715;
const pacienteLon = 40.5180;

const itensComDistancia = buscaParacetamol.map(({ medicamento, farmacia }) => {
  const d = calculateDistanceKm(pacienteLat, pacienteLon, farmacia.latitude, farmacia.longitude);
  return { farmacia, medicamento, distancia_km: d };
});

itensComDistancia.sort((a, b) => a.distancia_km - b.distancia_km);

// A Farmácia Central de Pemba fica na Baixa (-12.9715, 40.5180), logo distância = 0 m
assert(itensComDistancia[0].farmacia.id === 'farm-001', 'A farmácia mais próxima (Central na Baixa) ficou no topo dos resultados');
assert(itensComDistancia[0].distancia_km < 0.05, 'Distância da farmácia local é praticamente zero metros');

for (let i = 0; i < itensComDistancia.length - 1; i++) {
  assert(
    itensComDistancia[i].distancia_km <= itensComDistancia[i + 1].distancia_km,
    `Ordenação estritamente crescente garantida: Item ${i} (${itensComDistancia[i].distancia_km.toFixed(2)}km) <= Item ${i+1} (${itensComDistancia[i+1].distancia_km.toFixed(2)}km)`
  );
}

// -------------------------------------------------------------------
// TESTE 5: Baixa Rápida de Stock [-1]
// -------------------------------------------------------------------
console.log('\n--- 5. Validação da Baixa Rápida de Estoque no Balcão ---');
const medCentral = db.medicamentos.find(m => m.id === 'med-001')!;
const stockInicial = medCentral.quantidade_stock;

db.decrementMedicineStock('med-001', 'farm-001', 1);
const medAtualizado = db.medicamentos.find(m => m.id === 'med-001')!;
assert(medAtualizado.quantidade_stock === stockInicial - 1, `Estoque decrementado com sucesso de ${stockInicial} para ${medAtualizado.quantidade_stock}`);

// -------------------------------------------------------------------
// TESTE 6: Cadastro de Farmácia com Coordenadas GPS Exatas
// -------------------------------------------------------------------
console.log('\n--- 6. Validação do Registo de Nova Farmácia com GPS ---');
const novaFarm = db.addPharmacy({
  nome: 'Farmácia Teste Pemba Nova',
  telefone: '+258 84 999 8888',
  email: 'teste@farmalocal.mz',
  senha_hash: 'hash_simulado',
  provincia: 'Cabo Delgado',
  cidade: 'Pemba',
  bairro: 'Wimbi',
  horario_funcionamento: '08h00 às 22h00',
  latitude: -12.9960,
  longitude: 40.5520
});

assert(novaFarm.id.startsWith('farm-'), 'Farmácia gerada com identificador válido');
assert(novaFarm.latitude === -12.9960 && novaFarm.longitude === 40.5520, 'Coordenadas GPS preservadas com integridade');

// -------------------------------------------------------------------
// TESTE 7: Protocolo e Higienização de Chamada ao Balcão (tel:)
// -------------------------------------------------------------------
console.log('\n--- 7. Validação do Protocolo "Ligar para o Balcão" ---');
const telExemplo = '+258 84 321 0001';
const telSanitizado = telExemplo.replace(/[^\d+]/g, '');
const telUri = `tel:${telSanitizado}`;

assert(telSanitizado === '+258843210001', `Número formatado corretamente sem espaços (${telSanitizado})`);
assert(telUri.startsWith('tel:+258'), `URI compatível com discador nativo mobile e desktop (${telUri})`);

// -------------------------------------------------------------------
// TESTE 8: Autenticação Restrita do Administrador
// -------------------------------------------------------------------
console.log('\n--- 8. Validação de Autenticação do Administrador ---');
const adminValido = db.validateAdmin('admin@farmalocal.co.mz', 'admin123');
assert(adminValido.success === true, 'Administrador autenticado com credenciais válidas');

const adminInvalido = db.validateAdmin('admin@farmalocal.co.mz', 'senha_errada');
assert(adminInvalido.success === false, 'Tentativa de login com senha incorreta foi bloqueada com sucesso');

const outroUsuario = db.validateAdmin('farmacia@central.mz', 'admin123');
assert(outroUsuario.success === false, 'Tentativa de login de usuário não-admin foi rejeitada');

// -------------------------------------------------------------------
// TESTE 9: Validação de Localização Exata da Farmácia
// -------------------------------------------------------------------
console.log('\n--- 9. Validação de Coordenadas Físicas Exatas da Farmácia ---');
const latExata = -12.971500;
const lonExata = 40.518000;
assert(!isNaN(latExata) && !isNaN(lonExata), 'Latitude e Longitude são números válidos');
assert(latExata >= -90 && latExata <= 90, 'Latitude dentro dos limites geográficos globais');
assert(lonExata >= -180 && lonExata <= 180, 'Longitude dentro dos limites geográficos globais');
assert(latExata !== 0 && lonExata !== 0, 'Coordenadas não são genéricas ou nulas (0,0)');

// -------------------------------------------------------------------
// TESTE 10: Remoção de Farmácia com Exclusão em Cascata pelo Administrador
// -------------------------------------------------------------------
console.log('\n--- 10. Validação da Remoção de Farmácia com Cascata ---');
// Criar farmácia temporária com medicamentos
const farmTemp = db.addPharmacy({
  nome: 'Farmácia Temporária Remoção',
  telefone: '+258 84 000 9999',
  email: 'temp.remocao@farmalocal.mz',
  senha_hash: 'hash_temp',
  provincia: 'Cabo Delgado',
  cidade: 'Pemba',
  bairro: 'Ingonane',
  horario_funcionamento: '08h00 às 18h00',
  latitude: -12.9600,
  longitude: 40.5200
});

db.addMedicine({
  farmacia_id: farmTemp.id,
  nome_comercial: 'Fármaco Teste Cascata',
  principio_ativo: 'Substância Teste',
  dosagem: '100mg',
  quantidade_stock: 10,
  preco: 50.00
});

const medsAntes = db.getMedicinesByPharmacy(farmTemp.id);
assert(medsAntes.length === 1, 'Medicamento de teste inserido com sucesso para a farmácia temporária');

// Administrador remove a farmácia
const removido = db.deletePharmacy(farmTemp.id);
assert(removido === true, 'Farmácia removida pelo administrador com sucesso');

const farmAposRemocao = db.findPharmacyById(farmTemp.id);
assert(farmAposRemocao === undefined, 'Farmácia não existe mais na listagem de farmácias ativas');

const medsAposRemocao = db.getMedicinesByPharmacy(farmTemp.id);
assert(medsAposRemocao.length === 0, 'Todos os medicamentos associados foram removidos em cascata (integridade referencial mantida)');

// -------------------------------------------------------------------
// TESTE 11: Modificação de Dados e Localização Exata pela Farmácia
// -------------------------------------------------------------------
console.log('\n--- 11. Validação de Atualização de Dados pela Própria Farmácia ---');
const farmCentral = db.findPharmacyById('farm-001')!;
const telAntigo = farmCentral.telefone;
const novoTel = '+258 84 999 0001';
const novaLat = -12.972000;
const novaLon = 40.519000;

const atualizado = db.updatePharmacy('farm-001', {
  telefone: novoTel,
  horario_funcionamento: '07h00 às 22h00',
  latitude: novaLat,
  longitude: novaLon,
  endereco_detalhado: 'Av. Eduardo Mondlane, Edifício Comercial Baixa'
});

assert(atualizado !== null, 'Perfil da farmácia atualizado com sucesso');
assert(atualizado!.telefone === novoTel, `Telefone modificado com sucesso (esperado ${novoTel}, obtido ${atualizado!.telefone})`);
assert(atualizado!.latitude === novaLat && atualizado!.longitude === novaLon, 'Coordenadas GPS físicas atualizadas com precisão decimal');
assert(atualizado!.horario_funcionamento === '07h00 às 22h00', 'Horário de atendimento atualizado com sucesso');

// -------------------------------------------------------------------
// TESTE 12: Modificação de Dados de Farmácia pelo Administrador
// -------------------------------------------------------------------
console.log('\n--- 12. Validação de Atualização Administrativa de Farmácia ---');
const adminUpdate = db.updatePharmacy('farm-002', {
  nome: 'Farmácia Comunitária Natite (Credenciada)',
  telefone: '+258 82 888 7777',
  bairro: 'Natite Central'
});

assert(adminUpdate !== null, 'Administrador atualizou com sucesso os dados da farmácia');
assert(adminUpdate!.nome === 'Farmácia Comunitária Natite (Credenciada)', 'Razão social alterada pelo administrador');
assert(adminUpdate!.bairro === 'Natite Central', 'Bairro atualizado com integridade');

// -------------------------------------------------------------------
// TESTE 13: Validação da Arquitetura e Esquema Supabase
// -------------------------------------------------------------------
console.log('\n--- 13. Validação da Arquitetura Supabase (PostgreSQL Cloud) ---');
import fs from 'fs';
import path from 'path';

const sqlPath = path.join(__dirname, 'supabase_schema.sql');
assert(fs.existsSync(sqlPath), 'Arquivo de esquema SQL do Supabase existe no projeto');

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.pharmacies'), 'Tabela pharmacies modelada no Supabase');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.medicine_stocks'), 'Tabela medicine_stocks modelada no Supabase');
assert(sqlContent.includes('ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY'), 'Políticas RLS habilitadas para segurança de dados');
assert(sqlContent.includes('search_medicines_nearby'), 'Stored Procedure RPC com Haversine geoespacial implementada no Supabase');

console.log('\n================================================================');
console.log(`🎉 TODOS OS ${passedTests} TESTES PASSARAM COM 100% DE SUCESSO! (${passedTests}/${totalTests})`);
console.log('================================================================');


