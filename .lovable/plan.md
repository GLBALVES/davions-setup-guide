# Conectar valor aos Custom Fields do contrato

Hoje cada custom field tem apenas um `default_value` global. Vamos passar a permitir 3 origens de valor por campo, escolhidas no editor de contratos. A resolução continua automática (sem revisão manual).

## 1. Modelo de dados

Migration em `contract_custom_fields`:
- `value_source TEXT NOT NULL DEFAULT 'static'` — `'static' | 'mapped' | 'client_input'`
- `mapped_key TEXT` — quando `value_source = 'mapped'`, guarda a chave de uma variável built-in (ex: `client_tax_id`, `client_address`, `session_title`, etc.)
- `client_prompt TEXT` — quando `value_source = 'client_input'`, é o rótulo da pergunta ao cliente
- `client_input_type TEXT DEFAULT 'text'` — `'text' | 'textarea' | 'date' | 'number'`
- `required BOOLEAN DEFAULT false`

(`default_value` continua existindo como fallback.)

Nova tabela `booking_custom_field_values` para guardar respostas do cliente:
- `booking_id UUID` (FK lógica)
- `field_key TEXT`
- `value TEXT`
- PK: (booking_id, field_key)
- RLS: fotógrafo dono via `bookings.photographer_id`; insert público via service_role no fluxo de booking.

## 2. Editor de contratos (`ContractEditor.tsx`)

No bloco de "adicionar custom field", trocar o input único por um pequeno form:
- Label
- Select **Origem do valor**: `Texto fixo` / `Mapear a campo existente` / `Perguntar ao cliente`
- Se `mapped`: Select com a lista de `CONTRACT_VARIABLES` (client_name, client_email, client_phone, client_tax_id, client_address, session_*, photographer_*, studio_*, etc.)
- Se `client_input`: campo com o texto da pergunta + tipo (text/textarea/date/number) + checkbox obrigatório
- Se `static`: input de valor padrão (comportamento atual)

Listagem dos custom fields mostra um badge com a origem (Mapeado / Cliente / Fixo).

## 3. Booking — coleta dos valores do cliente

No wizard de agendamento (mesma tela do `Your Info` / briefing — `BookingConfirm` / componente do passo de dados do cliente):
- Buscar os `contract_custom_fields` do fotógrafo onde `value_source = 'client_input'` E que apareçam no `contract_text` da sessão (regex `[[key]]` ou `data-variable="key"`).
- Renderizar uma seção **"Informações para o contrato"** com cada pergunta como input do tipo configurado.
- Validar `required` antes de avançar.
- No submit do booking, gravar em `booking_custom_field_values`.

## 4. Resolução em `resolveContractVariables`

Atualizar a função para aceitar um terceiro parâmetro `customFieldValues?: Record<string, string>` e mudar a precedência:
```
valor final = customFieldValues[key]                          // resposta do cliente
            ?? data[mapped_key] (se value_source = 'mapped')   // valor mapeado
            ?? data[key]                                       // override por sessão (futuro)
            ?? default_value                                   // fallback
            ?? ""
```

Pontos de chamada a atualizar:
- `BookingConfirm.tsx` — carregar `booking_custom_field_values` do booking atual e passar à função.
- `SessionDetailPage.tsx` (preview no painel) — carregar valores se já existir booking; senão, usar mapped/default.
- `session-booking-webhook` (edge) e qualquer lugar que congele HTML do contrato no booking — resolver com os valores antes de gravar `bookings.contract_html_snapshot`.

## 5. i18n

Adicionar strings PT/EN/ES em `LanguageContext` para: "Origem do valor", "Texto fixo", "Mapear a campo existente", "Perguntar ao cliente", "Pergunta ao cliente", "Tipo do campo", "Obrigatório", "Informações para o contrato".

## 6. Memória

Atualizar `mem://features/contracts-custom-fields` descrevendo as 3 origens e a tabela de respostas.

## Detalhes técnicos

- Lista de `mapped_key` permitidas = `CONTRACT_VARIABLES` exportado de `ContractEditor.tsx` (já existe).
- `value_source = 'client_input'` com campo não usado no contrato da sessão NÃO deve ser perguntado (filtra pelo HTML do contrato).
- Manter compatibilidade: registros antigos ficam com `value_source = 'static'` (default da migration), comportamento idêntico ao atual.
- Sem realtime; sem alterar fluxo de assinatura.

## Arquivos afetados

- migration nova (schema + tabela + RLS)
- `src/pages/dashboard/ContractEditor.tsx` (UI + tipos + resolveContractVariables)
- `src/pages/store/SessionDetailPage.tsx` (preview)
- `src/pages/BookingConfirm.tsx` (coleta + persistência + resolução)
- componente do passo "Your Info" do wizard (renderizar perguntas)
- `supabase/functions/session-booking-webhook/index.ts` (snapshot do contrato)
- `src/contexts/LanguageContext.tsx` (i18n)
