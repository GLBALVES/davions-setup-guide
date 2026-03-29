

## Plano: Módulo Email Manager no Admin Panel

### Resumo
Integrar o módulo completo de Email Manager do projeto [Modulo Email](/projects/eb85356c-c100-4b89-b49e-ea22505df1ce) dentro do Admin Panel do Davions, adaptado ao layout e design system existente.

### Decisão de i18n
O Davions usa `LanguageContext` próprio (não react-i18next). O módulo original usa `react-i18next`. Para evitar conflito, vou **instalar react-i18next/i18next** como dependências e inicializá-lo isoladamente para o módulo de email. O seletor de idioma do módulo será sincronizado com o `LanguageContext` do Davions (quando o usuário muda idioma no admin, o i18next do email acompanha).

---

### 1. Banco de dados — 9 tabelas com RLS

Criar via migration:

| Tabela | Colunas principais | RLS |
|---|---|---|
| `email_contas` | id, user_id, nome, email, cor, assinatura, padrao, provedor, imap_*, smtp_* | user_id = auth.uid() |
| `email_emails` | id, user_id, tipo, remetente, email_remetente, assunto, preview, corpo, hora, data, lido, favorito, prioridade, tags[], pasta, conta_id, destinatario, email_destinatario, status, motivo_spam | user_id = auth.uid() |
| `email_pastas` | id, user_id, nome, icone, cor, regras (jsonb), email_ids (text[]) | user_id = auth.uid() |
| `email_assinaturas` | id, user_id, nome, conteudo, conta_ids (text[]) | user_id = auth.uid() |
| `email_templates` | id, user_id, nome, categoria, assunto, corpo, tom, criado_por_ia, criado_em, usos | user_id = auth.uid() |
| `email_grupos` | id, user_id, nome | user_id = auth.uid() |
| `email_grupo_contatos` | id, grupo_id (FK), user_id, nome, email | user_id = auth.uid() |
| `email_regras_segmentacao` | id, user_id, se_tipo, se_valor, entao_tipo, entao_valor | user_id = auth.uid() |
| `email_preferencias` | id (=user_id), user_id, marcar_ao_abrir, mostrar_preview, notificacoes, emails_por_pagina, idioma_ia, resposta_auto_* | user_id = auth.uid() |
| `email_bloqueados` | id, user_id, email | user_id = auth.uid() |

Todas com `user_id uuid not null default auth.uid()`, RLS habilitado, policies ALL para `auth.uid() = user_id`.

### 2. Edge Function `email-ai`

Copiar `supabase/functions/email-ai/index.ts` exatamente como está do projeto referência. Usa `LOVABLE_API_KEY` (já configurado) e Gemini 2.5 Flash via Lovable AI Gateway.

### 3. Dependências

Instalar `i18next` e `react-i18next`.

### 4. Novos arquivos no projeto

| Arquivo | Origem | Adaptações |
|---|---|---|
| `src/i18n/email-i18n.ts` | `src/i18n/index.ts` | Renomear para não conflitar; exportar instância isolada |
| `src/i18n/locales/email-pt.json` | `pt.json` | Cópia exata (351 linhas) |
| `src/i18n/locales/email-en.json` | `en.json` | Cópia exata (400 linhas) |
| `src/i18n/locales/email-es.json` | `es.json` | Cópia exata (351 linhas) |
| `src/lib/email-ai-helper.ts` | `src/lib/ai-helper.ts` | Cópia exata (10 linhas), chama `email-ai` |
| `src/hooks/use-email-data.ts` | Existente — renomear para evitar conflito com hook existente → `src/hooks/use-admin-email-data.ts` | Adaptar nomes de tabelas (prefixo `email_`) |
| `src/components/admin/AdminEmailManager.tsx` | `ModuloEmailManager.tsx` (~2500 linhas) | Remover header/sidebar próprios, usar `AdminLayout`; trocar imports de i18n e ai-helper; adaptar cores ao design system do admin |
| `src/components/admin/AdminComposeModal.tsx` | `ComposeModal.tsx` (~506 linhas) | Mesmas adaptações de imports |
| `src/pages/admin/AdminEmail.tsx` | Novo | Wrapper: `<AdminLayout><AdminEmailManager /></AdminLayout>` |

### 5. Routing e Sidebar

**`src/components/admin/AdminSidebar.tsx`**: Adicionar item `{ to: "/admin/email", label: "Email", icon: Mail }` no array `NAV`.

**`src/App.tsx`**: Adicionar rota `<Route path="/admin/email" element={<ProtectedRoute><AdminEmail /></ProtectedRoute>} />`.

### 6. Adaptações visuais

- Remover o header próprio do módulo (o header do admin já fornece contexto)
- O componente ocupa `flex-1` dentro do `AdminLayout` (sidebar + main)
- Manter as cores neutras do admin (bg-background, text-foreground, border-border)
- O seletor de idioma fica sincronizado com o LanguageContext do Davions

### Detalhes técnicos

- O hook `use-admin-email-data.ts` consulta tabelas com prefixo `email_` para não conflitar com tabelas existentes do projeto
- A instância i18next do módulo é separada da do Davions, mas sincronizada via `useEffect` que observa o `lang` do `LanguageContext`
- Todas as tabelas usam `auth.uid()` diretamente (não `get_my_photographer_id()`), pois este é um módulo por usuário, não por estúdio
- O `email-ai` edge function será deployado automaticamente

### Ordem de execução
1. Migration (criar 10 tabelas)
2. Deploy edge function `email-ai`
3. Instalar i18next + react-i18next
4. Criar arquivos i18n (config + 3 locales)
5. Criar `email-ai-helper.ts`
6. Criar `use-admin-email-data.ts`
7. Criar `AdminComposeModal.tsx`
8. Criar `AdminEmailManager.tsx`
9. Criar `AdminEmail.tsx` (page)
10. Atualizar `AdminSidebar.tsx` e `App.tsx`

