
## Plano de Implementação — Isolamento Multi-Empresa (Aprovado)

### Resumo do que será feito

**1 migration SQL + 2 arquivos de hook/context + ~39 arquivos frontend**

---

### Migration SQL (1 arquivo)

```sql
-- 1. Função que resolve o photographer_id correto para o usuário logado
CREATE OR REPLACE FUNCTION public.get_my_photographer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT photographer_id FROM public.studio_members
     WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
       AND status = 'active' LIMIT 1),
    auth.uid()
  );
$$;

-- 2. Corrigir trigger: não criar photographers row para membros
CREATE OR REPLACE FUNCTION public.handle_new_user() ...

-- 3. Limpeza: remover photographers fantasmas de membros existentes
DELETE FROM public.photographers p
WHERE EXISTS (
  SELECT 1 FROM public.studio_members sm
  JOIN auth.users u ON u.email = sm.email
  WHERE u.id = p.id AND sm.status = 'active'
) AND NOT EXISTS (
  SELECT 1 FROM public.studio_members WHERE photographer_id = p.id
);

-- 4. Recriar RLS em ~25 tabelas de negócio
-- DROP + CREATE para cada tabela usando get_my_photographer_id()
```

---

### Hook `useStudioPermissions` — mudança no retorno

Adiciona `photographerId: string | null` resolvido durante o load:
- Owner → `user.id`
- Membro → `member.photographer_id` da tabela `studio_members`

---

### AuthContext — novo campo `photographerId`

Expõe `photographerId` globalmente para que todas as páginas evitem chamar o hook repetidamente. Resolve uma vez no startup após autenticação.

---

### Frontend — padrão de substituição em todas as pages

```tsx
// Antes
const { user } = useAuth();
.eq("photographer_id", user.id)

// Depois
const { photographerId } = useAuth();
.eq("photographer_id", photographerId ?? user!.id)
```

Páginas e componentes: Dashboard, Sessions, SessionForm, Galleries, GalleryDetail, Bookings, Schedule, Clients, Projects, Settings, Personalize, BlogManager, BlogEditor, SiteSeo, EmailMarketing, todos os Email/Push editors, Workflows, WorkflowProject, RecurringWorkflows, AIAgents, Chat, CreativeStudio, WebsiteSettings, Revenue, Finance (5 páginas), AccessControl, SocialMedia, HelpCenter, BugReportDialog + componentes de sidebar/header/formulários.

---

### O que permanece inalterado

- `studio_roles` e `studio_members`: RLS mantém `auth.uid()` (somente o dono gerencia time)
- Políticas públicas: store, galeria pública, booking — sem alteração
- Admin RBAC via `has_role()`: sem alteração
- Edge functions: já usam `service_role`, não afetadas
