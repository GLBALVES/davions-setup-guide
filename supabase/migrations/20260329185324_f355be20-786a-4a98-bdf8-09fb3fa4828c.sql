
-- Email module tables with RLS

-- 1. email_contas
CREATE TABLE public.email_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  cor text NOT NULL DEFAULT '#378ADD',
  assinatura text NOT NULL DEFAULT '',
  padrao boolean NOT NULL DEFAULT false,
  provedor text NOT NULL DEFAULT 'custom',
  imap_ativo boolean NOT NULL DEFAULT false,
  imap_servidor text NOT NULL DEFAULT '',
  imap_porta integer NOT NULL DEFAULT 993,
  imap_seguranca text NOT NULL DEFAULT 'ssl',
  imap_usuario text NOT NULL DEFAULT '',
  imap_senha text NOT NULL DEFAULT '',
  smtp_ativo boolean NOT NULL DEFAULT false,
  smtp_servidor text NOT NULL DEFAULT '',
  smtp_porta integer NOT NULL DEFAULT 465,
  smtp_seguranca text NOT NULL DEFAULT 'ssl',
  smtp_usuario text NOT NULL DEFAULT '',
  smtp_senha text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_contas" ON public.email_contas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. email_emails
CREATE TABLE public.email_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'recebido',
  remetente text NOT NULL DEFAULT '',
  email_remetente text NOT NULL DEFAULT '',
  assunto text NOT NULL DEFAULT '',
  preview text NOT NULL DEFAULT '',
  corpo text NOT NULL DEFAULT '',
  hora text NOT NULL DEFAULT '',
  data text NOT NULL DEFAULT '',
  lido boolean NOT NULL DEFAULT false,
  favorito boolean NOT NULL DEFAULT false,
  prioridade text NOT NULL DEFAULT 'normal',
  tags text[] NOT NULL DEFAULT '{}',
  pasta text,
  conta_id text,
  destinatario text,
  email_destinatario text,
  status text,
  motivo_spam text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_emails" ON public.email_emails FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. email_pastas
CREATE TABLE public.email_pastas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  icone text NOT NULL DEFAULT 'file-text',
  cor text NOT NULL DEFAULT 'blue',
  regras jsonb NOT NULL DEFAULT '[]',
  email_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_pastas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_pastas" ON public.email_pastas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. email_assinaturas
CREATE TABLE public.email_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  conteudo text NOT NULL DEFAULT '',
  conta_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_assinaturas" ON public.email_assinaturas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. email_templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'Outro',
  assunto text NOT NULL DEFAULT '',
  corpo text NOT NULL DEFAULT '',
  tom text NOT NULL DEFAULT 'formal',
  criado_por_ia boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  usos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_templates" ON public.email_templates FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. email_grupos
CREATE TABLE public.email_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_grupos" ON public.email_grupos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. email_grupo_contatos
CREATE TABLE public.email_grupo_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id uuid NOT NULL REFERENCES public.email_grupos(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_grupo_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_grupo_contatos" ON public.email_grupo_contatos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. email_regras_segmentacao
CREATE TABLE public.email_regras_segmentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  se_tipo text NOT NULL DEFAULT '',
  se_valor text NOT NULL DEFAULT '',
  entao_tipo text NOT NULL DEFAULT '',
  entao_valor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_regras_segmentacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_regras_segmentacao" ON public.email_regras_segmentacao FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. email_preferencias
CREATE TABLE public.email_preferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  marcar_ao_abrir boolean NOT NULL DEFAULT true,
  mostrar_preview boolean NOT NULL DEFAULT true,
  notificacoes boolean NOT NULL DEFAULT true,
  emails_por_pagina integer NOT NULL DEFAULT 25,
  idioma_ia text NOT NULL DEFAULT 'Português',
  resposta_auto_ativa boolean NOT NULL DEFAULT false,
  resposta_auto_assunto text NOT NULL DEFAULT '',
  resposta_auto_mensagem text NOT NULL DEFAULT '',
  resposta_auto_de text NOT NULL DEFAULT '',
  resposta_auto_ate text NOT NULL DEFAULT '',
  resposta_auto_apenas_conhecidos boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_preferencias" ON public.email_preferencias FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 10. email_bloqueados
CREATE TABLE public.email_bloqueados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_bloqueados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own email_bloqueados" ON public.email_bloqueados FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
