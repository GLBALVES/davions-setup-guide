

## Preparar o aplicativo para LGPD (Lei Geral de Proteção de Dados)

### Análise do estado atual

O app já possui:
- Delete Account (exclusão de conta com confirmação)
- Links para Privacy Policy e Terms of Service (sem páginas reais)
- Checkbox de aceite de contrato no booking

O app **não possui**:
- Cookie consent banner
- Páginas de Política de Privacidade e Termos de Serviço
- Consentimento explícito para coleta de dados no booking público
- Exportação de dados pessoais (direito de portabilidade)
- Edge Function para exclusão completa de dados (a atual é incompleta)

---

### Plano de implementação

**1. Cookie Consent Banner**
- Criar componente `CookieBanner.tsx` com opções "Aceitar" / "Rejeitar" / "Configurar"
- Persistir escolha em `localStorage` (chave `cookie-consent`)
- Mostrar em todas as páginas públicas até o usuário decidir
- Textos em EN/PT/ES

**2. Páginas de Política de Privacidade e Termos de Serviço**
- Criar `/privacy` e `/terms` como rotas públicas
- Conteúdo estático cobrindo: dados coletados, finalidade, base legal, direitos do titular, retenção, contato do DPO
- Textos em EN/PT/ES via sistema de i18n existente

**3. Consentimento explícito no booking público**
- Adicionar checkbox obrigatório no `BookingConfirm.tsx`: "Concordo com a coleta e uso dos meus dados conforme a Política de Privacidade"
- Salvar timestamp do consentimento no banco (nova coluna `consent_given_at` na tabela `bookings`)

**4. Exportação de dados pessoais (portabilidade)**
- Criar Edge Function `export-user-data` que coleta todos os dados do usuário (perfil, bookings, galerias, clientes, projetos) e retorna como JSON
- Adicionar botão "Exportar meus dados" na página de Settings, aba Segurança

**5. Exclusão completa de dados (Edge Function robusta)**
- Criar/atualizar Edge Function `delete-account` que usa `service_role` para:
  - Deletar todos os registros em todas as tabelas vinculadas ao photographer_id
  - Remover arquivos do Storage (gallery-photos, session-covers, etc.)
  - Deletar o usuário do auth via `admin.deleteUser()`
- Atualizar `Settings.tsx` para chamar essa Edge Function

**6. Traduções i18n**
- Adicionar todas as novas strings (cookie banner, consentimento, exportação, privacy page, terms page) nos 3 idiomas

### Arquivos a criar
- `src/components/CookieBanner.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsOfService.tsx`
- `supabase/functions/export-user-data/index.ts`
- `supabase/functions/delete-account/index.ts`
- Nova migração SQL (coluna `consent_given_at`)

### Arquivos a modificar
- `src/App.tsx` — rotas `/privacy`, `/terms`, cookie banner
- `src/pages/BookingConfirm.tsx` — checkbox de consentimento LGPD
- `src/pages/dashboard/Settings.tsx` — botão exportar dados + chamar nova edge function de delete
- `src/lib/i18n/translations.ts` — novas strings EN/PT/ES

