# FarmaLocal Pemba — Central de Disponibilidade de Medicamentos em Farmácias

> **Plataforma Web de Georreferenciamento e Consulta em Tempo Real de Medicamentos em Farmácias**  
> Desenvolvida no âmbito acadêmico da cadeira de **Práticas em TI** (Engenharia de Software)  
> **Universidade Católica de Moçambique (UCM)** — Faculdade de Gestão, Turismo e Informática (FGTI), Pemba  
> **Autor:** Júnior Dicson Baulene (ID: `706240111`)  
> **Docente Orientador:** Celso de Sousa  
> **Ano Letivo:** 2026 | 3º Ano, Curso de Licenciatura em Tecnologias de Informação

---

## 1. Visão Geral do Projeto

Nas cidades moçambicanas, e particularmente em centros urbanos como Pemba, pacientes e familiares enfrentam diariamente enormes dificuldades para encontrar fármacos essenciais ou controlados. O processo tradicional exige deslocações físicas às cegas entre várias farmácias de transporte semicoletivo (*chapas*), resultando em custos financeiros elevados, atraso no início do tratamento e risco de abandono terapêutico.

O **FarmaLocal Pemba** resolve este problema ao conectar cidadãos e farmácias em tempo real:
1. **Para os Pacientes (Cidadãos):** Pesquisa ágil de medicamentos por nome comercial ou princípio ativo, com ordenação estrita das farmácias pela menor distância em relação à localização atual do telemóvel/computador (via sensor GPS e **Fórmula de Haversine**), exibindo preço em Meticais (MZN), stock em balcão e botões para chamada direta (`tel:`) ou rota no Google Maps.
2. **Para as Farmácias:** Auto-cadastro simplificado com captura direta da localização geográfica em 1 clique (sem depender de mapas pesados com pinos arrastáveis nem burocracias de licenciamento) e painel administrativo para gestão de catálogo com baixa rápida de stock (`[-1]`) em tempo real.

---

## 2. Documentação e Entregáveis de Engenharia de Software

O projeto conta com documentação completa de engenharia de software elaborada de acordo com as diretrizes da UCM FGTI e o padrão **StarUML (UML 2.5)**:

* 📄 **Documento Oficial em Word (.docx):** [`Documento_Desenho_Modelagem_Central_Medicamentos.docx`](./Documento_Desenho_Modelagem_Central_Medicamentos.docx)  
  *Documento canônico em 9 capítulos cobrindo contextualização arquitetural, matriz de requisitos (RF/RNF), user flows, dicionário de dados e os 12 diagramas formais.*
* 📋 **Product Requirements Document (PRD):** [`PRD_Central_Medicamentos.md`](file:///C:/Users/SERQUILHA/.gemini/antigravity/brain/ab498586-161f-4034-b447-902a6b92f712/PRD_Central_Medicamentos.md)  
  *Especificação de personas, regras de negócio e limites de escopo.*
* 🖼️ **Suíte Completa dos 12 Diagramas StarUML (PNG a 1600px):** localizada na pasta [`diagrams_output/`](./diagrams_output/)
  1. `diagrama_casos_de_uso.png`: Diagrama Geral de Casos de Uso com fronteira de sistema.
  2. `diagrama_classes_mvc.png`: Diagrama de Classes Arquitetural em Camadas MVC.
  3. `diagrama_sequencia_auth.png`: Diagrama de Sequência de Autenticação Segura.
  4. `diagrama_sequencia_cadastro_farmacia.png`: Diagrama de Sequência de Registo com GPS em 1 Clique.
  5. `diagrama_sequencia_busca_proximidade.png`: Diagrama de Sequência de Pesquisa e Cálculo Haversine.
  6. `diagrama_atividades_busca.png`: Diagrama de Atividades com Swimlanes da Busca Pública.
  7. `diagrama_atividades_cadastro_gps.png`: Diagrama de Atividades com Swimlanes do Cadastro com GPS.
  8. `diagrama_atividades_gestao_stock.png`: Diagrama de Atividades com Swimlanes da Gestão de Estoque.
  9. `diagrama_estados.png`: Diagrama de Transição de Estados (Ciclo de Vida do Medicamento).
  10. `diagrama_erd_relacional.png`: Diagrama Entidade-Relacionamento (ERD Crow's Foot Relacional).
  11. `diagrama_componentes.png`: Diagrama de Componentes Lógicos em Camadas.
  12. `diagrama_implantacao.png`: Diagrama de Implantação Cloud Isométrico com Nós 3D.

---

## 3. Funcionalidades Principais

### A. Módulo Público do Paciente / Cidadão
* **Busca Universal:** Pesquisa instantânea por nome comercial ou princípio ativo DCI (ex: Paracetamol, Amoxicilina, Coartem, Ibuprofeno, SRO).
* **Geolocalização GPS em 1 Toque:** Captura suave das coordenadas do dispositivo via `navigator.geolocation.getCurrentPosition`.
* **Ordenação Estrita por Proximidade:** Cálculo da distância esférica por Haversine, ordenando da menor para a maior distância.
* **Regra RN-01 (Filtro de Estoque Real):** Farmácias com estoque zerado (`quantidade_stock = 0`) são **automaticamente ocultadas** da listagem de busca.
* **Formatação Amigável (Regra RN-02):** Distâncias menores que 1 km aparecem em metros (`350 m`, `820 m`) e a partir de 1 km aparecem em quilômetros (`1.2 km`, `3.5 km`).
* **Ações Diretas:** Link telefónico de balcão (`tel:+258...`) e deep-link direto para traçar rota no Google Maps.

### B. Módulo das Farmácias Parceiras
* **Auto-Registo Ágil:** Cadastro com dados essenciais (Nome, Telefone, Bairro, Cidade, Horário) e botão direto `[📍 Capturar Minha Localização GPS Atual]`, gravando Latitude e Longitude sem intermediários.
* **Autenticação Segura:** Senhas protegidas com hashing irreversível Bcrypt e sessões em cookies HttpOnly.
* **Gestão de Balcão e Catálogo:** Inserção e edição de medicamentos com dosagem, preço unitário em Meticais (MZN) e quantidade.
* **Baixa Rápida de Balcão:** Botão `[-1 Baixa Rápida]` para abater imediatamente a unidade vendida no atendimento presencial.

---

## 4. Stack Tecnológica e Arquitetura

O sistema adota o padrão arquitetural clássico **Model-View-Controller (MVC)** em camadas desacopladas:

* **Backend / Runtime:** Node.js (v18+) com Express 5 e TypeScript.
* **Motor de Templates:** EJS (Server-Side Rendering) com componentes e layouts modulares.
* **Estilização / UI:** **100% Vanilla CSS puro**, design editorial premium, mobile-first, sem dependência de frameworks externos pesados.
* **Ícones:** Ícones vetoriais SVG inline estilizados e padronizados (sem emojis).
* **Persistência de Dados:** Camada relacional robusta com sincronização atômica em disco (`data/database.json`), pré-carregada com farmácias reais de Pemba (Baixa, Natite, Alto Gingone, Cariacó).
* **Georreferenciamento:** Algoritmo matemático de Haversine ($R = 6371\text{ km}$) executado com precisão submétrica.
* **Segurança:** Senhas com salt Bcrypt (10 rounds) e cookies de sessão isolados.

---

## 5. Estrutura de Diretórios do Projeto

```
Blue/
├── Documento_Desenho_Modelagem_Central_Medicamentos.docx  # Documento oficial em Word (1.2 MB)
├── PRD_Central_Medicamentos.md                            # Product Requirements Document
├── diagrams_output/                                       # Suíte dos 12 diagramas StarUML (PNG 1600px)
├── scripts/
│   ├── generate_diagrams_part1.js                         # Gerador dos diagramas 1 a 5 (SVG -> PNG)
│   ├── generate_diagrams_part2.js                         # Gerador dos diagramas 6 a 12 (SVG -> PNG)
│   └── generate_docx_document.js                          # Compilador do documento oficial Word (.docx)
├── app/                                                   # Código-fonte da aplicação
│   ├── package.json                                       # Dependências e scripts npm
│   ├── tsconfig.json                                      # Configuração TypeScript
│   ├── test_verification.ts                               # Suíte com 14 testes automatizados de negócio
│   ├── public/
│   │   └── css/style.css                                  # Folha de estilos 100% Vanilla CSS responsiva
│   └── src/
│       ├── types/index.ts                                 # Tipagens TypeScript (Pharmacy, MedicineStock)
│       ├── lib/
│       │   ├── haversine.ts                               # Algoritmo de cálculo de distância GPS
│       │   └── database.ts                                # Banco de dados e seed de Pemba
│       ├── controllers/
│       │   ├── SearchController.ts                        # Controlador da busca com GPS
│       │   ├── PharmacyAuthController.ts                  # Autenticação e cadastro com GPS
│       │   └── MedicineStockController.ts                 # Gestão de inventário e baixa rápida
│       ├── middlewares/
│       │   └── authMiddleware.ts                          # Guarda de sessão autenticada
│       ├── routes/
│       │   └── webRoutes.ts                               # Roteador unificado Express
│       ├── views/
│       │   ├── partials/ (header, navbar, footer)
│       │   └── pages/ (index, register_pharmacy, login_pharmacy, dashboard)
│       └── server.ts                                      # Servidor principal da aplicação
└── README.md                                              # Este documento
```

---

## 6. Como Executar a Aplicação Localmente

### Pré-requisitos
* Node.js (versão 18 ou superior) instalado no sistema.

### Passo a Passo

1. **Aceda à pasta da aplicação:**
   ```bash
   cd "s:\O Curso\3o Ano\2 S\Práticas em TI\Blue\app"
   ```

2. **Executar a Suíte de Testes Automatizados:**
   Valida todas as 14 regras de cálculo espacial, concorrência e integridade do inventário:
   ```bash
   npx tsx test_verification.ts
   ```
   *(Resultado esperado: 14/14 testes aprovados com 100% de sucesso).*

3. **Iniciar o Servidor em Desenvolvimento:**
   ```bash
   npx tsx src/server.ts
   ```

4. **Aceder no Navegador:**
   * **Página Inicial (Busca Pública com GPS):** [http://localhost:3000/](http://localhost:3000/)
   * **Cadastro de Farmácia (GPS em 1 Clique):** [http://localhost:3000/register](http://localhost:3000/register)
   * **Painel da Farmácia (Login):** [http://localhost:3000/login](http://localhost:3000/login)

---

## 7. Credenciais de Demonstração (Seed de Pemba)

Para testar o acesso imediato de farmácias com estoque pré-carregado:

| Estabelecimento | E-mail de Acesso | Palavra-passe | Bairro em Pemba | Coordenadas GPS |
| :--- | :--- | :---: | :--- | :---: |
| **Farmácia Central de Pemba** | `central@farmalocal.co.mz` | `123456` | Baixa / Centro | `-12.9715, 40.5180` |
| **Farmácia Comunitária Natite** | `natite@farmalocal.co.mz` | `123456` | Natite | `-12.9642, 40.5255` |
| **Farmácia Vida & Saúde Gingone** | `gingone@farmalocal.co.mz` | `123456` | Alto Gingone | `-12.9810, 40.5050` |
| **Farmácia Esperança Cariacó** | `cariaco@farmalocal.co.mz` | `123456` | Cariacó | `-12.9680, 40.5090` |

---

## 8. Licença e Créditos

Desenvolvido por **Júnior Dicson Baulene** sob orientação do docente **Celso de Sousa**, para a cadeira de **Práticas em TI** da **Universidade Católica de Moçambique (UCM)**, Faculdade de Gestão, Turismo e Informática (FGTI), Pemba, Outubro de 2026.
