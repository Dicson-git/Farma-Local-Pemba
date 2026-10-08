import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import webRoutes from './routes/webRoutes';
import { DatabaseService } from './lib/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializa a camada de dados e o seed em Pemba
DatabaseService.getInstance();

// Middlewares essenciais
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Arquivos estáticos (CSS, imagens)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configuração do motor de templates EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Rotas do sistema
app.use('/', webRoutes);

// Tratamento de 404
app.use((req, res) => {
  res.status(404).render('pages/index', {
    title: 'Página Não Encontrada | FarmaLocal Pemba',
    query: '',
    userLat: null,
    userLon: null,
    results: [],
    currentPharmacy: null
  });
});

app.listen(PORT, () => {
  console.log('================================================================');
  console.log('   💊 FarmaLocal Pemba - Central de Medicamentos em Farmácias  ');
  console.log('   UCM FGTI Pemba | Cadeira: Práticas em TI 2026               ');
  console.log('================================================================');
  console.log(`   🌐 Servidor ativo em: http://localhost:${PORT}`);
  console.log(`   🔍 Busca Pública (GPS): http://localhost:${PORT}/`);
  console.log(`   🏪 Registo de Farmácia: http://localhost:${PORT}/register`);
  console.log(`   🔐 Acesso ao Balcão:    http://localhost:${PORT}/login`);
  console.log('================================================================');
});
