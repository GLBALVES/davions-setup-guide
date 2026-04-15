

## Correção: Permitir site sem páginas (sem re-seed automático)

### Problema
Quando todas as páginas são deletadas, o sistema re-insere INITIAL_PAGES porque `data.length === 0` dispara o seed. O usuário não consegue ter um estado "limpo".

### Solução
Adicionar um flag `site_pages_initialized` na tabela `photographer_site` (que já existe). Quando o seed roda pela primeira vez, marca `true`. Nas próximas vezes, se não há páginas mas o flag é `true`, não faz seed.

### Passos

**1. Migration — adicionar coluna `site_pages_initialized`**
```sql
ALTER TABLE photographer_site 
ADD COLUMN IF NOT EXISTS site_pages_initialized boolean DEFAULT false;
```

**2. Alterar lógica de load no WebsiteEditor.tsx**
- Após buscar `site_pages`, se `data.length === 0`, verificar `photographer_site.site_pages_initialized`
- Se `false` → fazer seed + marcar `site_pages_initialized = true`
- Se `true` → não fazer seed, deixar lista vazia

**3. Marcar flag no seed existente**
Após inserir as páginas padrão com sucesso, executar:
```typescript
await supabase.from("photographer_site")
  .update({ site_pages_initialized: true })
  .eq("photographer_id", photographerId);
```

### Alternativa mais simples (sem migration)
Usar a própria existência de um registro em `photographer_site` como indicador. Mas isso já existe para todos os fotógrafos, então não funciona como diferenciador.

**Abordagem mais simples ainda**: guardar o flag no `localStorage` por photographer_id. Desvantagem: não persiste entre dispositivos.

### Recomendação
A migration é a solução correta — uma coluna boolean simples, sem impacto em RLS.

