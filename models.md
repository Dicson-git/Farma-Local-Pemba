# Modelos de Domínio do Sistema (Models)
## FarmaLocal Pemba — UCM FGTI 2026
**Autor:** Júnior Dicson Baulene (706240111) | **Orientador:** Celso de Sousa

---

### Visão Geral da Camada de Models (MVC)
A camada de **Models** do FarmaLocal Pemba reside no diretório de código-fonte em:
- 📁 **Código TypeScript dos Models:** `app/src/models/`
  - `PharmacyModel.ts` — Entidade Farmácia
  - `MedicineStockModel.ts` — Entidade Estoque de Medicamentos
  - `AdminModel.ts` — Entidade Administrador
  - `index.ts` — Centralizador de exportações
- 📄 **Ficheiro de Atalho do Código:** `app/src/models.ts` e `app/models.ts`

---

### 1. PharmacyModel (Entidade Farmácia)
Modela os estabelecimentos farmacêuticos cadastrados na cidade de Pemba.

| Atributo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (String) | Identificador único RFC 4122 |
| `nome` | `String` | Nome comercial / Razão social da farmácia |
| `telefone` | `String` | Telefone de atendimento (usado no botão "Ligar para o Balcão") |
| `email` | `String` | E-mail único para autenticação |
| `senha_hash` | `String` | Palavra-passe criptografada com Bcrypt (10 rounds) |
| `provincia` | `String` | Província (padrão: "Cabo Delgado") |
| `cidade` | `String` | Cidade (padrão: "Pemba") |
| `bairro` | `String` | Bairro físico em Pemba (ex: Baixa, Natite, Alto Gingone, Cariacó) |
| `endereco_detalhado` | `String?` | Ponto de referência ou morada completa |
| `horario_funcionamento`| `String` | Horário de atendimento presencial |
| `latitude` | `Number` | Coordenada física GPS capturada via satélite (precisão decimal) |
| `longitude` | `Number` | Coordenada física GPS capturada via satélite (precisão decimal) |
| `criado_em` | `ISO String` | Timestamp de cadastro |
| `atualizado_em` | `ISO String` | Timestamp da última modificação |

**Principais Regras e Métodos:**
- `getAll()`: Retorna todas as farmácias ativas.
- `findById(id)` / `findByEmail(email)`: Localização direta da entidade.
- `create(data)`: **Exclusivo do Administrador**. Auto-cadastro público é bloqueado.
- `update(id, updates)`: Permite alteração de todos os dados, contactos e recaptura de GPS pela própria farmácia ou pelo Administrador.
- `delete(id)`: Exclusão com cascata (remove todos os medicamentos associados).
- `sanitizePhoneForCall(telefone)`: Formata o número para o protocolo nativo de chamada telefónica `tel:+258...`.

---

### 2. MedicineStockModel (Entidade Estoque de Medicamentos)
Modela os fármacos disponíveis em cada farmácia parceira.

| Atributo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (String) | Identificador único RFC 4122 |
| `farmacia_id` | `UUID` (String) | Chave estrangeira referenciando a farmácia detentora |
| `nome_comercial` | `String` | Nome do medicamento (ex: "Paracetamol 500mg", "Amoxicilina") |
| `principio_ativo` | `String?` | DCI / Princípio ativo (ex: "Paracetamol", "Ibuprofeno") |
| `dosagem` | `String` | Forma farmacêutica e apresentação (ex: "Caixa c/ 20 Comprimidos") |
| `quantidade_stock` | `Number` | Quantidade atual em stock ($\ge 0$) |
| `preco` | `Number` | Preço unitário em Meticais (MZN) |
| `criado_em` | `ISO String` | Data de inserção no catálogo |
| `atualizado_em` | `ISO String` | Data de última movimentação |

**Principais Regras e Métodos:**
- 🚫 **Regra Anti-Duplicidade de Nomes:** O sistema **não permite** cadastrar medicamentos com o mesmo `nome_comercial` na mesma farmácia. Se a farmácia tentar adicionar um nome já existente, o sistema rejeita o cadastro e orienta o operador a atualizar o estoque existente via edição.
- 🔍 **Regra RN-01 (Filtro de Disponibilidade):** O método `searchAvailable()` oculta automaticamente medicamentos com `quantidade_stock <= 0` das buscas públicas de pacientes.
- ⚡ **Baixa Rápida de Balcão:** O método `quickDecrement(id, farmaciaId, 1)` abate 1 unidade instantaneamente no momento da venda.

---

### 3. AdminModel (Entidade Administrador)
Modela a conta mestra de administração do sistema.

| Atributo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `UUID` (String) | Identificador único do administrador |
| `nome` | `String` | Nome do administrador |
| `email` | `String` | E-mail de acesso ao painel `/admin` |
| `role` | `'ADMINISTRADOR'`| Nível de permissão restrito |

**Principais Regras e Métodos:**
- `authenticate(email, senha)`: Validação com verificação de hash e emissão de cookie de sessão protegida.
- `getPharmaciesSummary()`: Consolidação de indicadores estatísticos para o dashboard gerencial.
