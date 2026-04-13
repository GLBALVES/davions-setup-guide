

## Perguntar qual modelo salvar ao aprovar o carrossel

### Problema
Quando o usuário clica "Aprovar", o carrossel é salvo sem registrar qual modelo de layout (Modelo 1, 2 ou 3) foi escolhido, e sem perguntar ao usuário qual modelo ele quer associar ao salvamento.

### Solução

**1. Migração de banco** — Adicionar coluna `layout_model` e `background_config`:
```sql
ALTER TABLE public.carousel_historico
  ADD COLUMN IF NOT EXISTS background_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS layout_model text DEFAULT 'model1';
```

**2. Criar diálogo de confirmação ao aprovar** (`CarrosselPage.tsx`):
- Ao clicar "Aprovar", abrir um dialog/modal perguntando qual modelo salvar (Modelo 1, 2 ou 3), com o modelo atual pré-selecionado
- Usar componente `AlertDialog` ou `Dialog` do shadcn com 3 opções de radio/botão
- Ao confirmar no dialog, salvar o carrossel com `layout_model` e `background_config` no insert

**3. Atualizar `handleApprove`**:
- Receber o modelo escolhido como parâmetro
- Incluir `layout_model` e `background_config` no insert do Supabase

**4. Atualizar `CarrosselHistorico.tsx`**:
- Buscar `layout_model` no select
- Exibir badge com o modelo salvo (ex: "Modelo 2") em cada item do histórico
- Ao carregar, restaurar o `layoutModel` no estado

**5. Atualizar `handleLoadFromHistory`**:
- Receber `layout_model` e `background_config` do item carregado
- Restaurar `setLayoutModel` e `setBackground` ao carregar

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | Adicionar `background_config` e `layout_model` em `carousel_historico` |
| Editar | `src/pages/dashboard/creative/CarrosselPage.tsx` — dialog de seleção de modelo + salvar configs |
| Editar | `src/components/creative/carrossel/CarrosselEditor.tsx` — botão aprovar abre dialog |
| Editar | `src/components/creative/carrossel/CarrosselHistorico.tsx` — buscar e exibir modelo |

