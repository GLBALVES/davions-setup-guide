

## Nova aba "Documentos" no Email Manager

### Contexto
Atualmente o sync IMAP (`admin-sync-email`) não extrai anexos dos emails. Precisamos criar toda a infraestrutura para detectar, salvar e organizar documentos recebidos por email.

### Arquitetura

```text
┌─ admin-sync-email ─┐     ┌─ Storage ─────────┐
│ Detecta anexos MIME │────▶│ email-documents/  │
│ Salva metadata      │     │  {remetente}/     │
└─────────────────────┘     │    arquivo.pdf    │
         │                  └───────────────────┘
         ▼
┌─ email_documents ───┐
│ id, user_id, email_id│
│ sender, file_name    │
│ file_url, mime_type  │
│ size, saved, auto    │
└──────────────────────┘
```

### Alterações

#### 1. Migração SQL — nova tabela `email_documents` + storage bucket
- Tabela `email_documents`: `id`, `user_id`, `email_id`, `sender_email`, `sender_name`, `file_name`, `file_url`, `mime_type`, `file_size`, `saved` (boolean), `created_at`
- RLS: users can CRUD own
- Tabela `email_document_settings`: `id`, `user_id`, `auto_save` (boolean default false)
- Storage bucket `email-documents` (privado) com RLS

#### 2. Edge Function `admin-sync-email/index.ts`
- Ao parsear o raw email, detectar partes MIME com `Content-Disposition: attachment` ou `Content-Type` com `name=`
- Extrair filename, mime_type, conteúdo base64
- Inserir registro em `email_documents` com `saved = false` (pendente de decisão do usuário)
- Se auto-save ativado nas preferências, salvar no storage bucket organizado por remetente e marcar `saved = true`

#### 3. `src/components/admin/AdminEmailManager.tsx`
- Adicionar `"documentos"` ao `tabsDef` com ícone `FileText`
- Nova função `renderDocumentos()`:
  - Lista de documentos agrupados por remetente (accordion ou seções)
  - Cada item mostra: nome do arquivo, tipo, tamanho, data, remetente
  - Botão "Salvar" para documentos pendentes (`saved = false`)
  - Botão "Download" para documentos já salvos
  - Toggle no topo: "Salvar documentos automaticamente"
  - Busca por nome de arquivo ou remetente
- No `renderRightPanel` (detalhe do email recebido): se o email tiver anexos, mostrar seção com lista de documentos e botão "Deseja salvar este documento?"
- Adicionar ao `tabContentMap`

#### 4. `src/hooks/use-admin-email-data.ts`
- Carregar `email_documents` e `email_document_settings` no hook
- Expor `documents`, `documentSettings`, `persistDocumentSave`, `persistAutoSaveToggle`

#### 5. i18n — 3 arquivos de locale
- Chaves novas: `tabs.documentos`, `documents.title`, `documents.save`, `documents.autoSave`, `documents.autoSaveDesc`, `documents.download`, `documents.noDocuments`, `documents.savePrompt`, `documents.savedSuccess`, `documents.groupBySender`

### Arquivos modificados
- Nova migração SQL (tabela + bucket + RLS)
- `supabase/functions/admin-sync-email/index.ts`
- `src/components/admin/AdminEmailManager.tsx`
- `src/hooks/use-admin-email-data.ts`
- `src/i18n/locales/email-pt.json`
- `src/i18n/locales/email-en.json`
- `src/i18n/locales/email-es.json`

### Resultado esperado
```text
Menu carrossel: ... | Documentos | ...
Aba Documentos:
  [Toggle] Salvar automaticamente ✓
  ── partners@davions.com ──
    📎 contrato_2026.pdf  (245 KB)  [Salvar] [Download]
    📎 orcamento.xlsx     (128 KB)  [✓ Salvo] [Download]
  ── cliente@email.com ──
    📎 briefing.docx      (89 KB)   [Salvar] [Download]

Detalhe do email (entrada):
  [📎 2 anexos]
  contrato.pdf — Deseja salvar? [Sim] [Não]
```

