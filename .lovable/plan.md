## Problema

Hoje os "campos customizados" do contrato (ex.: CPF/CNPJ) só guardam um `default_value` estático — não há vínculo com o cadastro real do cliente. Além disso:

1. A tabela `clients` não tem coluna para CPF/CNPJ.
2. O passo "Your Info" do booking não coleta CPF/CNPJ.
3. A função `resolveContractVariables` existe mas **nunca é chamada** no fluxo público — o contrato é renderizado cru (`session.contract_text`), então nem `[[client_name]]` está sendo substituído hoje.

## Solução

Tratar CPF/CNPJ como um **campo nativo do cliente** (não custom), coletá-lo no booking, e fazer a resolução real das variáveis ao exibir e ao "congelar" o contrato no momento do aceite.

### 1. Banco de dados (migração)
- Adicionar coluna `tax_id text` em `public.clients` (armazena CPF ou CNPJ — mesmo campo, formato livre).
- Adicionar coluna `client_tax_id text` em `public.bookings` (snapshot no momento do aceite, para o contrato congelado refletir o valor histórico).

### 2. Variável padrão de contrato
Em `src/pages/dashboard/ContractEditor.tsx`:
- Adicionar `{ key: "client_tax_id", label: "CPF / CNPJ" }` à lista `CONTRACT_VARIABLES`.
- Aparecerá automaticamente no menu "Insert variable" e na sidebar de variáveis do editor.

### 3. Coleta no booking público
Em `src/pages/BookingConfirm.tsx`, passo "Your Info":
- Adicionar input "CPF / CNPJ" (com máscara dinâmica leve: 11 dígitos → CPF, 14 → CNPJ; validação opcional).
- Tornar **obrigatório apenas quando o idioma/locale é PT-BR** (o app é multi-idioma — em EN/ES fica opcional).
- Carregar valor existente de `clients.tax_id` no `useEffect` de load.
- Salvar no `upsert` de `clients` em `handleSaveClientInfo`.

### 4. Renderização do contrato com variáveis resolvidas
Em `BookingConfirm.tsx`, ao montar o passo "contract":
- Buscar `contract_custom_fields` do fotógrafo (pelos valores default).
- Chamar `resolveContractVariables(session.contract_text, data, customFields)` antes do `dangerouslySetInnerHTML`, onde `data` inclui:
  - `client_name`, `client_email`, `client_phone`, `client_address`, `client_tax_id` (do form atual)
  - `session_title`, `session_date`, `session_time`, `session_duration`, `session_price`, `session_location`
  - `photographer_name`, `studio_name`, `studio_address`
- No momento do aceite (botão "Accept"), persistir o HTML resolvido em uma nova coluna `bookings.contract_html_snapshot` para auditoria (e gravar `client_tax_id` no booking).

### 5. UX no editor de contrato
- Renomear a label de "Custom Fields" para deixar claro que são variáveis com **valor padrão fixo** (não vinculadas a cliente).
- Adicionar uma nota informativa: "Use a variável CPF / CNPJ para puxar o valor automaticamente do cadastro do cliente."

## Detalhes técnicos

```text
clients
  + tax_id text  (nullable)

bookings
  + client_tax_id        text  (nullable, snapshot)
  + contract_html_snapshot text (nullable, contrato resolvido + aceito)
```

Resolução de variáveis (mapa em BookingConfirm):
```ts
const data = {
  client_name: clientInfo.full_name,
  client_email: booking.client_email,
  client_phone: clientInfo.phone,
  client_tax_id: clientInfo.tax_id,
  client_address: [clientInfo.address_street, clientInfo.address_city, clientInfo.address_state].filter(Boolean).join(", "),
  session_title: session.title,
  session_date: formatDate(booking.booked_date),
  session_time: avail?.start_time?.slice(0,5),
  session_duration: `${session.duration_minutes} min`,
  session_price: formatMoney(session.price),
  session_location: session.location,
  photographer_name: photographer.full_name,
  studio_name: photographer.business_name,
  studio_address: photographer.address,
};
```

## Arquivos afetados

- `supabase/migrations/<new>.sql` (criar)
- `src/pages/dashboard/ContractEditor.tsx` (adicionar variável padrão + nota UX)
- `src/pages/BookingConfirm.tsx` (campo CPF/CNPJ, resolver variáveis, snapshot)
- `src/pages/dashboard/Personalize.tsx` (ajuste de label/copy se necessário)

## i18n
Strings novas em EN / PT-BR / ES via `LanguageContext`:
- "CPF / CNPJ" (label)
- "Required for Brazilian clients" (helper)
- Nota no editor sobre vincular ao cadastro

## Fora do escopo
- Validação algorítmica de CPF/CNPJ (dígitos verificadores) — pode ser adicionada depois se necessário.
- Migração de dados antigos: bookings antigos ficam com `client_tax_id` nulo.
