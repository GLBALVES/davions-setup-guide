## Contexto
A página FinancePayables (`/dashboard/finance/payables`) já possui:
- Busca textual (descrição ou fornecedor)
- Filtro por status: Todos / Pendentes / Atrasados / Pagos

O usuário solicita **filtros adicionais** e **ordenação por colunas**.

## O que será implementado

### 1. Novos filtros
- **Categoria**: `<Select>` com todas as categorias disponíveis (base + custom), incluindo opção "Todas".
- **Fornecedor**: `<Select>` populado dinamicamente com os fornecedores únicos dos items carregados, incluindo opção "Todos".
- **Período de data**: dois date pickers ("De" / "Até") para filtrar o `due_date` dentro de um intervalo.
- **Limpar filtros**: botão para resetar todos os filtros de uma vez.

### 2. Ordenação por colunas
Os cabeçalhos da tabela (`Due Date`, `Description`, `Supplier`, `Category`, `Amount`, `Status`) tornam-se clicáveis para ordenação alternada (asc/desc). Será adicionado um estado `sortBy` e `sortDir`.

Ordens disponíveis:
- `due_date` (default: asc)
- `description`
- `supplier`
- `category`
- `amount_cents`
- `status`

Ícones de seta (↑/↓) indicarão a coluna e direção ativas.

### 3. UI/UX
- Os filtros ficarão numa linha abaixo da barra de busca + botões de status, usando o mesmo estilo minimalista existente (bordas finas, tipografia leve, tracking wide).
- A ordenação usará os próprios cabeçalhos `<th>` da tabela, com ícones `ChevronUp` / `ChevronDown` do lucide-react.

### 4. i18n
Serão adicionadas as novas chaves necessárias nas traduções EN/PT/ES:
- `filterByCategory`, `filterBySupplier`, `filterFromDate`, `filterToDate`, `clearFilters`
- Manter consistência com o estilo de chaves existentes.

### 5. Arquivos alterados
- `src/pages/dashboard/FinancePayables.tsx` — lógica de filtro/ordenação e UI
- `src/lib/i18n/translations.ts` — novas strings de tradução (EN, PT, ES)

Não envolve backend; é puramente frontend.