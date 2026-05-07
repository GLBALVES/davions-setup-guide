## Objetivo
Formatar em tempo real os campos de valor monetário do `SessionForm.tsx` conforme o idioma do app (PT/ES → `1.500,00` · EN → `1,500.00`), mantendo o `$` à esquerda. O state interno continua em formato canônico (`"1500.50"` com ponto decimal) para não quebrar a lógica existente de salvamento em centavos.

## Campos afetados (apenas SessionForm)

**Step 3 — Payment**
- Session Price (linha ~2082) → `price`
- Deposit Amount quando `depositType === "fixed"` (linha ~2232) → `depositAmount`

**Step 4 — Additional Photos**
- Tier · Price/photo (linha ~2464) → `photoTiers[].price_per_photo`

**Step 5 — Extras**
- Extra · Price (linha ~2580) → `sessionExtras[].price`

**Previews derivados** (apenas display, sem input):
- `Tax: $X.XX` / `Total: $X.XX` (linhas 2145–2146)
- `Deposit: $X.XX` / `Remaining: $X.XX` (linhas 2249–2258)
- Tier preview `× $X.XX = $X.XX` (linhas 2477–2479)

**Fora de escopo:** `taxRate %`, `depositAmount %`, `min_photos`, `quantity`, `balanceDueOffsetHours` — não são moeda.

## Implementação

### 1. Novo helper `src/lib/currency-format.ts`

Funções puras parametrizadas por `lang: "en" | "pt" | "es"`:

- **`formatCurrencyInput(raw: string, lang)`** → string para exibição
  - Aceita o valor canônico (`"1500.50"`) ou já formatado e devolve no formato local
  - PT/ES: vírgula = decimal, ponto = milhar
  - EN: ponto = decimal, vírgula = milhar
  - Preserva separador decimal final enquanto o usuário digita (ex: `1500,` continua `1.500,`)
  - Limita a 2 casas decimais
  - Re-aplica separadores de milhar à parte inteira

- **`parseCurrencyInput(formatted: string, lang)`** → string canônica `"1500.50"`
  - Remove separadores de milhar
  - Converte vírgula decimal (PT/ES) para ponto
  - Strip tudo que não for dígito/decimal
  - Retorna `""` para input vazio (preserva placeholder)

- **`displayMoney(num: number, lang)`** → string formatada para previews (sem o `$`, que continua em JSX)
  - Usa `Intl.NumberFormat` com `minimumFractionDigits: 2, maximumFractionDigits: 2`

### 2. Alterações em `SessionForm.tsx`

Para cada `<Input>` de moeda listado:
```tsx
<Input
  type="text"
  inputMode="decimal"
  value={formatCurrencyInput(state, lang)}
  onChange={(e) => setState(parseCurrencyInput(e.target.value, lang))}
  placeholder={lang === "en" ? "0.00" : "0,00"}
  ...
/>
```

Para os previews:
```tsx
<span>${displayMoney(taxAmt, lang)}</span>
```

`lang` já está disponível via `useLanguage()` (linha 108).

### 3. Compatibilidade
- O state interno permanece canônico (`"1500.50"`), então `parseFloat(price || "0") * 100` em `handleFinish`, `handleFinishTiers`, `handleFinishExtras` continua funcionando sem alteração.
- `loadSession` já popula os states com strings canônicas (`"1500.50"`) — `formatCurrencyInput` os exibe formatados ao renderizar.
- Cálculos derivados (`priceVal * taxRate / 100`, `tier.price_per_photo * tier.min_photos`) ficam intactos.

### 4. Notas técnicas
- Cursor: ao formatar em tempo real, o cursor pula para o final. Comportamento aceitável para campos numéricos curtos (escolha do usuário).
- Não há mudança em traduções, schema do DB ou outras páginas.
- Nenhuma migração de dados é necessária.

## Arquivos tocados
- `src/lib/currency-format.ts` *(novo)*
- `src/pages/dashboard/SessionForm.tsx` *(4 inputs + 4 previews)*
