

## Duas alterações na página `/admin/email`

### 1. Adicionar botões "Arquivar" e "Denunciar como Spam" na aba Entrada

**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

**Handlers (após linha ~800):**
- `handleArquivar`: muda `tipo` do email selecionado para `"arquivo"`, persiste com `persistEmailUpdate`, limpa seleção, toast de confirmação
- `handleDenunciarSpam`: muda `tipo` para `"spam"` com `motivoSpam: "manual"`, persiste, limpa seleção, toast

**UI — `renderEntradaActions` (linha 1040-1057):**
Adicionar dois botões antes do botão de excluir:
- `<Archive>` Arquivar → chama `handleArquivar`
- `<ShieldOff>` Spam → chama `handleDenunciarSpam`

**i18n:** Adicionar chaves `emailActions.archive` e `emailActions.reportSpam` nos 3 arquivos de locale (`email-en.json`, `email-es.json`, `email-pt.json`).

### 2. Layout fullscreen sem sidebar para `/admin/email`

**Arquivo:** `src/pages/admin/AdminEmail.tsx`

Deixar de usar `<AdminLayout>` (que inclui a `AdminSidebar`). Renderizar diretamente:
- Um header mínimo com um `<ChevronLeft>` + texto "Voltar" que navega para `/admin`
- O `<AdminEmailManager />` ocupando o restante da tela (`flex-1`)

Layout:
```text
┌─────────────────────────────────┐
│ ← Voltar    (header fino h-12) │
├─────────────────────────────────┤
│                                 │
│    AdminEmailManager (flex-1)   │
│                                 │
└─────────────────────────────────┘
```

**Arquivo:** `src/components/admin/AdminLayout.tsx` — sem alterações.

### Arquivos modificados
- `src/pages/admin/AdminEmail.tsx`
- `src/components/admin/AdminEmailManager.tsx`
- `src/i18n/locales/email-en.json`
- `src/i18n/locales/email-es.json`
- `src/i18n/locales/email-pt.json`

