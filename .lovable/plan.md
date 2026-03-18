
## Divergências encontradas — TXT record name

Há uma inconsistência clara entre os arquivos sobre qual nome usar para o registro TXT de verificação:

### Estado atual por arquivo

| Arquivo | TXT Name | TXT Value prefix |
|---|---|---|
| `AdminDomains.tsx` | `_davions.<rootDomain>` | `davions_verify=` |
| `check-domain/index.ts` | `_davions.<rootDomain>` | `davions_verify=` |
| `WebsiteSettings.tsx` | `_lovable` | `lovable_verify=` |
| `CustomDomainDocs.tsx` | `_lovable` | `lovable_verify=` |
| `notify-domain-saved/index.ts` | `_lovable` | `lovable_verify=` |

O fotógrafo vê `_lovable` + `lovable_verify=` nas instruções (WebsiteSettings + CustomDomainDocs), mas o `check-domain` verifica `_davions` + `davions_verify=`. Resultado: a verificação sempre falha.

### O que você disse
> "Não vamos usar mais esse fluxo... não vamos ter intervenção da equipe"

E anteriormente:
> "Não vamos usar _davions, será _lovable"

### Padrão correto a adotar: `_lovable` + `lovable_verify=`

Isso é o que o fotógrafo vê e configura. O `check-domain` precisa ser alinhado.

---

## Plano de correção

### 4 arquivos a corrigir

**1. `supabase/functions/check-domain/index.ts`**  
- `getExpectedTxtValue()`: trocar `davions_verify=` → `lovable_verify=`  
- `txtHost`: trocar `_davions.${rootDomain}` → `_lovable.${rootDomain}`  
- Atualizar o campo `host` retornado no JSON de resposta

**2. `src/pages/admin/AdminDomains.tsx`**  
- `getDomainInfo()`: trocar `_davions.${rootDomain}` → `_lovable.${rootDomain}`  
- `verifyValue`: trocar `davions_verify=` → `lovable_verify=`

**3. `src/pages/dashboard/WebsiteSettings.tsx`**  
- Linha 904: nome já é `_lovable` ✓, mas o host está solto — confirmar que é `_lovable.<rootDomain>` ou apenas `_lovable`  
- Verificar se a lógica de subdomínio calcula o rootDomain para o TXT ou usa `_lovable` literal

**4. `supabase/functions/notify-domain-saved/index.ts`**  
- Linha 62: já usa `_lovable` + `lovable_verify=` ✓ (já correto, sem mudanças necessárias)

### Detalhe importante: nome do host TXT

No `AdminDomains.tsx` o nome do TXT é `_lovable.<rootDomain>` (ex: `_lovable.giombelli.com.br`), mas em `WebsiteSettings.tsx` e `CustomDomainDocs.tsx` o nome mostrado ao fotógrafo é apenas `_lovable` (sem o root domain).

A correção deve padronizar para **`_lovable`** como nome do host (sem o root domain concatenado), pois é mais simples e é o que o fotógrafo está configurando no registrar — ele já está no contexto do seu domínio. O `check-domain` deve buscar `_lovable.<rootDomain>` internamente (já que o DNS lookup precisa do hostname completo).

Portanto o padrão correto é:
- **Exibir ao fotógrafo**: `_lovable` (Name) + `lovable_verify=...` (Value)
- **Verificar via DNS**: `_lovable.<rootDomain>` (hostname completo para o lookup)

### Resumo das mudanças

```text
check-domain/index.ts
  - line 25: davions_verify= → lovable_verify=
  - line 126: _davions.${rootDomain} → _lovable.${rootDomain}

AdminDomains.tsx
  - line 67: davions_verify= → lovable_verify=
  - line 72: _davions.${rootDomain} → _lovable (exibição) / _lovable.${rootDomain} (lookup)
  - line 77: _davions.${rootDomain} → _lovable (exibição)
```
