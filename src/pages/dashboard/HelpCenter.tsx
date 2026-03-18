import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BugReportDialog } from "@/components/dashboard/BugReportDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Camera, CalendarDays, Images, DollarSign,
  Globe, Settings, Bot, Mail, HelpCircle, ChevronDown,
  ArrowRight, Bug, BookOpen, Zap,
} from "lucide-react";

type Lang = "en" | "pt" | "es";

interface Article { q: string; a: string; }
interface Category {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  articles: Article[];
}
interface UIStrings {
  knowledgeBase: string;
  howCanWeHelp: string;
  articlesAcross: string;
  categories: string;
  searchPlaceholder: string;
  allCategories: string;
  quickStart: string;
  resultsFor: string;
  result: string;
  results: string;
  noArticlesFound: string;
  tryDifferent: string;
  article: string;
  articles: string;
  stillNeedHelp: string;
  cantFind: string;
  reportBug: string;
  emailSupport: string;
}

const ui: Record<Lang, UIStrings> = {
  en: {
    knowledgeBase: "Knowledge Base",
    howCanWeHelp: "How can we help?",
    articlesAcross: "articles across",
    categories: "categories",
    searchPlaceholder: "Search articles…",
    allCategories: "All",
    quickStart: "Quick Start",
    resultsFor: "results for",
    result: "result",
    results: "results",
    noArticlesFound: "No articles found for",
    tryDifferent: "Try a different search term or browse by category.",
    article: "article",
    articles: "articles",
    stillNeedHelp: "Still need help?",
    cantFind: "Can't find what you're looking for? Report a bug or reach out and we'll get back to you.",
    reportBug: "Report a Bug",
    emailSupport: "Email Support",
  },
  pt: {
    knowledgeBase: "Base de Conhecimento",
    howCanWeHelp: "Como podemos ajudar?",
    articlesAcross: "artigos em",
    categories: "categorias",
    searchPlaceholder: "Buscar artigos…",
    allCategories: "Todos",
    quickStart: "Início Rápido",
    resultsFor: "resultado(s) para",
    result: "resultado",
    results: "resultados",
    noArticlesFound: "Nenhum artigo encontrado para",
    tryDifferent: "Tente um termo diferente ou navegue por categoria.",
    article: "artigo",
    articles: "artigos",
    stillNeedHelp: "Ainda precisa de ajuda?",
    cantFind: "Não encontrou o que procura? Reporte um bug ou entre em contato e responderemos em breve.",
    reportBug: "Reportar Bug",
    emailSupport: "E-mail de Suporte",
  },
  es: {
    knowledgeBase: "Base de Conocimiento",
    howCanWeHelp: "¿Cómo podemos ayudarte?",
    articlesAcross: "artículos en",
    categories: "categorías",
    searchPlaceholder: "Buscar artículos…",
    allCategories: "Todos",
    quickStart: "Inicio Rápido",
    resultsFor: "resultado(s) para",
    result: "resultado",
    results: "resultados",
    noArticlesFound: "No se encontraron artículos para",
    tryDifferent: "Prueba con otro término o navega por categoría.",
    article: "artículo",
    articles: "artículos",
    stillNeedHelp: "¿Aún necesitas ayuda?",
    cantFind: "¿No encuentras lo que buscas? Reporta un error o contáctanos y te responderemos pronto.",
    reportBug: "Reportar Error",
    emailSupport: "Soporte por Email",
  },
};

const categoriesData: Record<Lang, Omit<Category, "icon">[]> = {
  en: [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Set up your account and understand the basics",
      articles: [
        { q: "How do I complete my profile?", a: "Go to **Settings → My Profile**. Fill in your name, business name, phone, address, and upload your profile/hero image. A complete profile is required to activate your public store." },
        { q: "What is a Store Slug?", a: "Your store slug is the unique URL segment for your public booking page (e.g. `davions.app/store/your-slug`). You can set it in **Settings → My Profile**. It cannot contain spaces — use hyphens instead." },
        { q: "How do I connect Stripe to accept payments?", a: "Go to **Settings → My Profile** and click **Connect Stripe**. You will be redirected to Stripe to create or link an existing account. Once connected, clients can pay at checkout and funds go directly to your Stripe account." },
        { q: "Can I invite team members?", a: "Yes. Go to **Settings → Access Control** and click **Create Studio User**. Enter their email address and assign the permissions they need. They will receive an invitation email." },
      ],
    },
    {
      id: "sessions",
      title: "Sessions & Bookings",
      description: "Create sessions, manage availability, and receive bookings",
      articles: [
        { q: "How do I create a session?", a: "Go to **Sessions → New Session**. Fill in the title, price, duration, description, and cover image. Set the availability (specific dates or recurring weekly slots). Publish the session to make it visible on your store." },
        { q: "What is a deposit?", a: "A deposit is an upfront partial payment clients make when booking. Enable it on the session form, set either a fixed amount or a percentage, and the remaining balance is collected separately." },
        { q: "How does availability work?", a: "Each session has its own availability calendar. You can add specific one-off dates or recurring weekly time slots. Clients can only book within those slots. Set **booking notice** (minimum advance notice) and **booking window** (how far ahead clients can book)." },
        { q: "How do I block time off?", a: "Go to **Schedule** and click on any day or time slot to open the **Block Time** dialog. You can block full days or specific hours with an optional reason. Blocked times prevent new bookings in those slots." },
        { q: "What is a Session Extra?", a: "Extras are optional add-ons clients can select at checkout (e.g. rush delivery, additional prints). Add them inside the session form under the **Extras** tab. Each extra has a name, price, and available quantity." },
        { q: "How do I send a gallery link after the shoot?", a: "Go to **Proof Galleries**, open the gallery, and click **Send Gallery Link**. The client will receive an email with their unique access link. If the gallery has an access code, the code is included in the email." },
      ],
    },
    {
      id: "galleries",
      title: "Galleries",
      description: "Upload, organize, and deliver photos to clients",
      articles: [
        { q: "What is the difference between Proof and Final galleries?", a: "**Proof galleries** are for client selection — clients can favorite photos and you can see their picks. **Final galleries** are for delivering edited photos. Both types support access codes and expiration dates." },
        { q: "How do I upload photos to a gallery?", a: "Open any gallery from the Galleries page and use the **Lightroom Plugin** or the **web uploader** (drag & drop). The Lightroom Plugin is the fastest option for large batches — download it from **Settings → Personalize**." },
        { q: "How do I add a watermark?", a: "Go to **Settings → Personalize → Watermarks**. Upload your watermark image (PNG with transparency recommended). Then open any gallery, click the watermark icon, and select the watermark to apply it to all photos." },
        { q: "How do I set an expiration date on a gallery?", a: "When creating or editing a gallery, set the **Expires at** field. After that date, the gallery will no longer be accessible by clients. You can extend or remove the expiration at any time." },
        { q: "Can clients download photos from the gallery?", a: "Yes. Clients can download individual photos or a full ZIP of the gallery. The download option appears in the gallery view. You can disable downloads per gallery if needed." },
      ],
    },
    {
      id: "finance",
      title: "Finance",
      description: "Track revenue, receivables, payables, and cash flow",
      articles: [
        { q: "What is the Finance Dashboard?", a: "The Finance Dashboard gives you a real-time overview of your studio's financial health: **total revenue**, **pending receivables**, **cash flow**, and period-over-period comparisons." },
        { q: "How do I log a manual transaction?", a: "Go to **Finance → Receivables** (for income) or **Finance → Payables** (for expenses). Click **New** and fill in the description, amount, category, and due date. Manual entries supplement automatic Stripe payments." },
        { q: "How do Stripe payouts work?", a: "Payments collected through your store go to your Stripe account. Stripe processes payouts to your bank account on a rolling schedule (typically 2 business days). You can view your Stripe balance and recent payouts in **Finance → Revenue**." },
      ],
    },
    {
      id: "marketing",
      title: "Website & Marketing",
      description: "Customize your public site, blog, SEO, and email campaigns",
      articles: [
        { q: "How do I customize my public website?", a: "Go to **Website Settings** and choose a template, set your headline, subheadline, and tagline, upload your hero image, and configure which sections are visible (About, Blog, Store, Booking, Contact)." },
        { q: "How do I create a blog post?", a: "Go to **Blog** and click **New Post**. Use the rich text editor to write your content. You can add a cover image, category, SEO metadata, and schedule the post for future publishing." },
        { q: "How do I set up SEO for my site?", a: "Go to **SEO** and configure the title, meta description, keywords, and Open Graph image for each page. You can also enable/disable indexing per page and set canonical URLs." },
        { q: "How do I connect a custom domain?", a: "Go to **Settings → My Profile → Custom Domain**. Enter your domain, then add the required A records and TXT verification record at your domain registrar. DNS propagation can take up to 48 hours. See the **Custom Domain Docs** page for step-by-step instructions." },
        { q: "How do email campaigns work?", a: "Go to **Emails** and create a new campaign. Write your HTML email, set your sender name and address, choose the audience, and schedule or send immediately. Automated emails are triggered by events like new bookings." },
      ],
    },
    {
      id: "ai",
      title: "AI & Automation",
      description: "AI agents, workflows, and recurring tasks",
      articles: [
        { q: "What are AI Agents?", a: "AI Agents are configurable chatbots that can handle customer support on your behalf. Each agent has a name, system prompt, knowledge base, and model settings. Agents can run in **auto-reply** or **supervised** mode." },
        { q: "What is supervised mode for AI agents?", a: "In **supervised mode**, the AI generates a draft reply that you review before it is sent to the client. In **auto-reply mode**, the AI sends the response directly. Switch between modes in the Chat Commander Bar at the top of the Chat page." },
        { q: "How do I add knowledge to an agent?", a: "Open **AI Agents**, edit an agent, and go to the **Knowledge Base** tab. Add topics with a title and content. This knowledge is injected into the agent's context so it can answer questions specific to your business." },
        { q: "What are Recurring Workflows?", a: "Recurring Workflows are tasks that repeat on a schedule (daily, weekly, monthly, etc.). Go to **Workflows → Recurring** and create a task with a frequency, start date, and optional owner. The system generates task instances automatically." },
      ],
    },
    {
      id: "settings",
      title: "Settings & Account",
      description: "Billing, permissions, and account management",
      articles: [
        { q: "How do I manage my subscription?", a: "Go to **Settings → Billing**. You can view your current plan, see past invoices, and manage or upgrade your subscription." },
        { q: "How do Access Control permissions work?", a: "Owners can invite Studio Users and grant them specific permissions (Sessions, Galleries, Bookings, etc.). Users only see the sections they have been granted access to. This is useful for assistants or second shooters." },
        { q: "How do I change my business currency?", a: "Go to **Settings → My Profile** and update the **Business Currency** field. This affects how prices are displayed and charged throughout the platform." },
      ],
    },
    {
      id: "lightroom",
      title: "Lightroom Plugin",
      description: "Upload photos directly from Lightroom Classic",
      articles: [
        { q: "How do I install the Lightroom plugin?", a: "Go to **Settings → Personalize → Galleries** tab and download the DavionsConnect plugin. In Lightroom Classic, go to **File → Plug-in Manager**, click **Add**, and select the downloaded `.lrplugin` folder." },
        { q: "How do I upload photos from Lightroom?", a: "Select the photos you want to export in Lightroom, then go to **File → Export → Export with Preset → Davions** or use the Publish service. Choose the target gallery and click Export/Publish." },
        { q: "The plugin isn't connecting. What do I do?", a: "Make sure you are logged in to the platform and that your API key is correctly entered in the plugin settings. You can regenerate your API key in **Settings → Personalize → Galleries**. Check the **LR Plugin Help** page for detailed troubleshooting steps." },
      ],
    },
  ],
  pt: [
    {
      id: "getting-started",
      title: "Primeiros Passos",
      description: "Configure sua conta e entenda o básico",
      articles: [
        { q: "Como faço para completar meu perfil?", a: "Acesse **Configurações → Meu Perfil**. Preencha seu nome, nome do negócio, telefone, endereço e envie sua foto de perfil/hero. Um perfil completo é necessário para ativar sua loja pública." },
        { q: "O que é um Store Slug?", a: "O slug da loja é o segmento único de URL da sua página de agendamento público (ex: `davions.app/store/seu-slug`). Você pode configurá-lo em **Configurações → Meu Perfil**. Não pode conter espaços — use hífens." },
        { q: "Como conecto o Stripe para receber pagamentos?", a: "Acesse **Configurações → Meu Perfil** e clique em **Conectar Stripe**. Você será redirecionado ao Stripe para criar ou vincular uma conta existente. Após conectado, os clientes podem pagar no checkout e os fundos vão direto para sua conta." },
        { q: "Posso convidar membros da equipe?", a: "Sim. Acesse **Configurações → Controle de Acesso** e clique em **Criar Usuário do Estúdio**. Informe o e-mail e atribua as permissões necessárias. Eles receberão um e-mail de convite." },
      ],
    },
    {
      id: "sessions",
      title: "Sessões e Agendamentos",
      description: "Crie sessões, gerencie disponibilidade e receba agendamentos",
      articles: [
        { q: "Como crio uma sessão?", a: "Acesse **Sessões → Nova Sessão**. Preencha título, preço, duração, descrição e imagem de capa. Configure a disponibilidade (datas específicas ou slots semanais recorrentes). Publique a sessão para torná-la visível na sua loja." },
        { q: "O que é um depósito?", a: "Um depósito é um pagamento parcial antecipado feito pelo cliente no agendamento. Ative-o no formulário da sessão, defina um valor fixo ou percentual, e o saldo restante é cobrado separadamente." },
        { q: "Como funciona a disponibilidade?", a: "Cada sessão tem seu próprio calendário de disponibilidade. Você pode adicionar datas únicas ou horários semanais recorrentes. Clientes só podem agendar dentro desses slots. Configure o **aviso de agendamento** (antecedência mínima) e a **janela de agendamento** (com quanto tempo de antecedência o cliente pode agendar)." },
        { q: "Como bloqueio horários?", a: "Acesse **Agenda** e clique em qualquer dia ou horário para abrir o diálogo **Bloquear Horário**. Você pode bloquear dias inteiros ou horários específicos com um motivo opcional. Horários bloqueados impedem novos agendamentos nesses slots." },
        { q: "O que é um Extra de Sessão?", a: "Extras são complementos opcionais que os clientes podem selecionar no checkout (ex: entrega expressa, impressões adicionais). Adicione-os no formulário da sessão na aba **Extras**. Cada extra tem nome, preço e quantidade disponível." },
        { q: "Como envio o link da galeria após o ensaio?", a: "Acesse **Galerias de Prova**, abra a galeria e clique em **Enviar Link da Galeria**. O cliente receberá um e-mail com o link de acesso exclusivo. Se a galeria tiver código de acesso, ele será incluído no e-mail." },
      ],
    },
    {
      id: "galleries",
      title: "Galerias",
      description: "Envie, organize e entregue fotos para seus clientes",
      articles: [
        { q: "Qual a diferença entre galerias de Prova e Final?", a: "**Galerias de Prova** são para seleção pelo cliente — clientes podem favoritar fotos e você vê as escolhas. **Galerias Finais** são para entregar fotos editadas. Ambos os tipos suportam códigos de acesso e datas de expiração." },
        { q: "Como faço upload de fotos em uma galeria?", a: "Abra qualquer galeria na página Galerias e use o **Plugin Lightroom** ou o **uploader web** (arrastar e soltar). O Plugin Lightroom é a opção mais rápida para grandes lotes — baixe em **Configurações → Personalizar**." },
        { q: "Como adiciono uma marca d'água?", a: "Acesse **Configurações → Personalizar → Marcas d'água**. Envie sua imagem de marca d'água (PNG com transparência recomendado). Em seguida, abra qualquer galeria, clique no ícone de marca d'água e selecione-a para aplicar a todas as fotos." },
        { q: "Como defino uma data de expiração em uma galeria?", a: "Ao criar ou editar uma galeria, configure o campo **Expira em**. Após essa data, a galeria não estará mais acessível para os clientes. Você pode estender ou remover a expiração a qualquer momento." },
        { q: "Os clientes podem baixar fotos da galeria?", a: "Sim. Os clientes podem baixar fotos individuais ou um ZIP completo da galeria. A opção de download aparece na visualização da galeria. Você pode desativar os downloads por galeria, se necessário." },
      ],
    },
    {
      id: "finance",
      title: "Financeiro",
      description: "Acompanhe receita, contas a receber, a pagar e fluxo de caixa",
      articles: [
        { q: "O que é o Painel Financeiro?", a: "O Painel Financeiro oferece uma visão em tempo real da saúde financeira do seu estúdio: **receita total**, **contas a receber pendentes**, **fluxo de caixa** e comparações por período." },
        { q: "Como registro uma transação manual?", a: "Acesse **Financeiro → Contas a Receber** (para receitas) ou **Financeiro → Contas a Pagar** (para despesas). Clique em **Novo** e preencha descrição, valor, categoria e data de vencimento. Entradas manuais complementam os pagamentos automáticos do Stripe." },
        { q: "Como funcionam os repasses do Stripe?", a: "Pagamentos coletados pela sua loja vão para sua conta Stripe. O Stripe processa repasses para sua conta bancária em um cronograma contínuo (normalmente 2 dias úteis). Você pode ver seu saldo Stripe e repasses recentes em **Financeiro → Receita**." },
      ],
    },
    {
      id: "marketing",
      title: "Site e Marketing",
      description: "Personalize seu site público, blog, SEO e campanhas de e-mail",
      articles: [
        { q: "Como personalizo meu site público?", a: "Acesse **Configurações do Site** e escolha um template, configure seu título, subtítulo e tagline, envie sua imagem hero e configure quais seções são visíveis (Sobre, Blog, Loja, Agendamento, Contato)." },
        { q: "Como crio um post no blog?", a: "Acesse **Blog** e clique em **Novo Post**. Use o editor de texto rico para escrever seu conteúdo. Você pode adicionar imagem de capa, categoria, metadados de SEO e agendar o post para publicação futura." },
        { q: "Como configuro o SEO do meu site?", a: "Acesse **SEO** e configure título, meta descrição, palavras-chave e imagem Open Graph para cada página. Você também pode ativar/desativar indexação por página e definir URLs canônicas." },
        { q: "Como conecto um domínio personalizado?", a: "Acesse **Configurações → Meu Perfil → Domínio Personalizado**. Insira seu domínio, depois adicione os registros A e o registro TXT de verificação no seu registrador de domínio. A propagação de DNS pode levar até 48 horas. Consulte a página **Documentação de Domínio** para instruções detalhadas." },
        { q: "Como funcionam as campanhas de e-mail?", a: "Acesse **E-mails** e crie uma nova campanha. Escreva seu e-mail HTML, configure nome e endereço do remetente, escolha o público e agende ou envie imediatamente. E-mails automatizados são disparados por eventos como novos agendamentos." },
      ],
    },
    {
      id: "ai",
      title: "IA e Automação",
      description: "Agentes de IA, workflows e tarefas recorrentes",
      articles: [
        { q: "O que são Agentes de IA?", a: "Agentes de IA são chatbots configuráveis que podem lidar com o suporte ao cliente em seu nome. Cada agente tem nome, prompt de sistema, base de conhecimento e configurações de modelo. Agentes podem operar em modo **resposta automática** ou **supervisionado**." },
        { q: "O que é o modo supervisionado para agentes de IA?", a: "No modo **supervisionado**, a IA gera uma resposta rascunho que você revisa antes de enviar ao cliente. No modo **resposta automática**, a IA envia a resposta diretamente. Alterne entre os modos na Barra de Comando do Chat no topo da página de Chat." },
        { q: "Como adiciono conhecimento a um agente?", a: "Abra **Agentes de IA**, edite um agente e acesse a aba **Base de Conhecimento**. Adicione tópicos com título e conteúdo. Esse conhecimento é injetado no contexto do agente para que ele possa responder perguntas específicas do seu negócio." },
        { q: "O que são Workflows Recorrentes?", a: "Workflows Recorrentes são tarefas que se repetem em uma agenda (diária, semanal, mensal, etc.). Acesse **Workflows → Recorrentes** e crie uma tarefa com frequência, data de início e responsável opcional. O sistema gera instâncias de tarefas automaticamente." },
      ],
    },
    {
      id: "settings",
      title: "Configurações e Conta",
      description: "Faturamento, permissões e gerenciamento de conta",
      articles: [
        { q: "Como gerencio minha assinatura?", a: "Acesse **Configurações → Faturamento**. Você pode visualizar seu plano atual, ver faturas anteriores e gerenciar ou atualizar sua assinatura." },
        { q: "Como funcionam as permissões de Controle de Acesso?", a: "Proprietários podem convidar Usuários do Estúdio e conceder permissões específicas (Sessões, Galerias, Agendamentos, etc.). Os usuários só veem as seções às quais têm acesso. Útil para assistentes ou segundos fotógrafos." },
        { q: "Como altero a moeda do meu negócio?", a: "Acesse **Configurações → Meu Perfil** e atualize o campo **Moeda do Negócio**. Isso afeta como os preços são exibidos e cobrados em toda a plataforma." },
      ],
    },
    {
      id: "lightroom",
      title: "Plugin Lightroom",
      description: "Envie fotos diretamente do Lightroom Classic",
      articles: [
        { q: "Como instalo o plugin do Lightroom?", a: "Acesse **Configurações → Personalizar → aba Galerias** e baixe o plugin DavionsConnect. No Lightroom Classic, vá em **Arquivo → Gerenciador de Plug-ins**, clique em **Adicionar** e selecione a pasta `.lrplugin` baixada." },
        { q: "Como faço upload de fotos pelo Lightroom?", a: "Selecione as fotos que deseja exportar no Lightroom, depois vá em **Arquivo → Exportar → Exportar com Predefinição → Davions** ou use o serviço de Publicação. Escolha a galeria de destino e clique em Exportar/Publicar." },
        { q: "O plugin não está conectando. O que faço?", a: "Verifique se você está logado na plataforma e se sua chave de API está corretamente inserida nas configurações do plugin. Você pode regenerar sua chave de API em **Configurações → Personalizar → Galerias**. Consulte a página **Ajuda do Plugin LR** para etapas detalhadas de solução de problemas." },
      ],
    },
  ],
  es: [
    {
      id: "getting-started",
      title: "Primeros Pasos",
      description: "Configura tu cuenta y comprende lo básico",
      articles: [
        { q: "¿Cómo completo mi perfil?", a: "Ve a **Configuración → Mi Perfil**. Completa tu nombre, nombre del negocio, teléfono, dirección y sube tu foto de perfil/hero. Un perfil completo es necesario para activar tu tienda pública." },
        { q: "¿Qué es un Store Slug?", a: "El slug de la tienda es el segmento único de URL de tu página de reservas pública (ej: `davions.app/store/tu-slug`). Puedes configurarlo en **Configuración → Mi Perfil**. No puede contener espacios — usa guiones." },
        { q: "¿Cómo conecto Stripe para aceptar pagos?", a: "Ve a **Configuración → Mi Perfil** y haz clic en **Conectar Stripe**. Serás redirigido a Stripe para crear o vincular una cuenta existente. Una vez conectado, los clientes pueden pagar en el checkout y los fondos van directamente a tu cuenta." },
        { q: "¿Puedo invitar miembros del equipo?", a: "Sí. Ve a **Configuración → Control de Acceso** y haz clic en **Crear Usuario del Estudio**. Ingresa su correo electrónico y asigna los permisos necesarios. Recibirán un correo de invitación." },
      ],
    },
    {
      id: "sessions",
      title: "Sesiones y Reservas",
      description: "Crea sesiones, gestiona disponibilidad y recibe reservas",
      articles: [
        { q: "¿Cómo creo una sesión?", a: "Ve a **Sesiones → Nueva Sesión**. Completa el título, precio, duración, descripción e imagen de portada. Configura la disponibilidad (fechas específicas o slots semanales recurrentes). Publica la sesión para que sea visible en tu tienda." },
        { q: "¿Qué es un depósito?", a: "Un depósito es un pago parcial anticipado que realizan los clientes al reservar. Actívalo en el formulario de la sesión, establece un monto fijo o porcentaje, y el saldo restante se cobra por separado." },
        { q: "¿Cómo funciona la disponibilidad?", a: "Cada sesión tiene su propio calendario de disponibilidad. Puedes agregar fechas únicas o slots semanales recurrentes. Los clientes solo pueden reservar dentro de esos slots. Configura el **aviso de reserva** (antelación mínima) y la **ventana de reserva** (con cuánta anticipación pueden reservar)." },
        { q: "¿Cómo bloqueo tiempo libre?", a: "Ve a **Agenda** y haz clic en cualquier día u horario para abrir el diálogo **Bloquear Tiempo**. Puedes bloquear días completos u horas específicas con un motivo opcional. Los tiempos bloqueados impiden nuevas reservas en esos slots." },
        { q: "¿Qué es un Extra de Sesión?", a: "Los extras son complementos opcionales que los clientes pueden seleccionar en el checkout (ej: entrega express, impresiones adicionales). Agrégalos en el formulario de sesión bajo la pestaña **Extras**. Cada extra tiene nombre, precio y cantidad disponible." },
        { q: "¿Cómo envío el enlace de galería después del shoot?", a: "Ve a **Galerías de Prueba**, abre la galería y haz clic en **Enviar Enlace de Galería**. El cliente recibirá un correo con su enlace de acceso único. Si la galería tiene código de acceso, el código se incluye en el correo." },
      ],
    },
    {
      id: "galleries",
      title: "Galerías",
      description: "Sube, organiza y entrega fotos a tus clientes",
      articles: [
        { q: "¿Cuál es la diferencia entre galerías de Prueba y Finales?", a: "Las **galerías de Prueba** son para selección del cliente — los clientes pueden marcar fotos como favoritas y tú puedes ver sus elecciones. Las **galerías Finales** son para entregar fotos editadas. Ambos tipos soportan códigos de acceso y fechas de expiración." },
        { q: "¿Cómo subo fotos a una galería?", a: "Abre cualquier galería desde la página Galerías y usa el **Plugin de Lightroom** o el **cargador web** (arrastrar y soltar). El Plugin de Lightroom es la opción más rápida para lotes grandes — descárgalo en **Configuración → Personalizar**." },
        { q: "¿Cómo agrego una marca de agua?", a: "Ve a **Configuración → Personalizar → Marcas de agua**. Sube tu imagen de marca de agua (PNG con transparencia recomendado). Luego abre cualquier galería, haz clic en el ícono de marca de agua y selecciónala para aplicarla a todas las fotos." },
        { q: "¿Cómo establezco una fecha de expiración en una galería?", a: "Al crear o editar una galería, configura el campo **Expira el**. Después de esa fecha, la galería ya no será accesible para los clientes. Puedes extender o eliminar la expiración en cualquier momento." },
        { q: "¿Pueden los clientes descargar fotos de la galería?", a: "Sí. Los clientes pueden descargar fotos individuales o un ZIP completo de la galería. La opción de descarga aparece en la vista de galería. Puedes deshabilitar las descargas por galería si es necesario." },
      ],
    },
    {
      id: "finance",
      title: "Finanzas",
      description: "Rastrea ingresos, cuentas por cobrar, por pagar y flujo de caja",
      articles: [
        { q: "¿Qué es el Panel Financiero?", a: "El Panel Financiero te brinda una vista en tiempo real de la salud financiera de tu estudio: **ingresos totales**, **cuentas por cobrar pendientes**, **flujo de caja** y comparaciones por período." },
        { q: "¿Cómo registro una transacción manual?", a: "Ve a **Finanzas → Cuentas por Cobrar** (para ingresos) o **Finanzas → Cuentas por Pagar** (para gastos). Haz clic en **Nuevo** y completa la descripción, monto, categoría y fecha de vencimiento. Las entradas manuales complementan los pagos automáticos de Stripe." },
        { q: "¿Cómo funcionan los pagos de Stripe?", a: "Los pagos cobrados a través de tu tienda van a tu cuenta de Stripe. Stripe procesa los pagos a tu cuenta bancaria en un calendario continuo (normalmente 2 días hábiles). Puedes ver tu saldo de Stripe y pagos recientes en **Finanzas → Ingresos**." },
      ],
    },
    {
      id: "marketing",
      title: "Sitio Web y Marketing",
      description: "Personaliza tu sitio público, blog, SEO y campañas de email",
      articles: [
        { q: "¿Cómo personalizo mi sitio web público?", a: "Ve a **Configuración del Sitio** y elige una plantilla, establece tu titular, subtitular y tagline, sube tu imagen hero y configura qué secciones son visibles (Sobre mí, Blog, Tienda, Reservas, Contacto)." },
        { q: "¿Cómo creo una publicación de blog?", a: "Ve a **Blog** y haz clic en **Nueva Publicación**. Usa el editor de texto enriquecido para escribir tu contenido. Puedes agregar imagen de portada, categoría, metadatos SEO y programar la publicación para el futuro." },
        { q: "¿Cómo configuro el SEO de mi sitio?", a: "Ve a **SEO** y configura el título, meta descripción, palabras clave e imagen Open Graph para cada página. También puedes activar/desactivar la indexación por página y establecer URLs canónicas." },
        { q: "¿Cómo conecto un dominio personalizado?", a: "Ve a **Configuración → Mi Perfil → Dominio Personalizado**. Ingresa tu dominio, luego agrega los registros A requeridos y el registro TXT de verificación en tu registrador de dominio. La propagación de DNS puede tardar hasta 48 horas. Consulta la página **Docs de Dominio Personalizado** para instrucciones paso a paso." },
        { q: "¿Cómo funcionan las campañas de email?", a: "Ve a **Emails** y crea una nueva campaña. Escribe tu email HTML, configura el nombre y dirección del remitente, elige la audiencia y programa o envía inmediatamente. Los emails automatizados se activan por eventos como nuevas reservas." },
      ],
    },
    {
      id: "ai",
      title: "IA y Automatización",
      description: "Agentes de IA, flujos de trabajo y tareas recurrentes",
      articles: [
        { q: "¿Qué son los Agentes de IA?", a: "Los Agentes de IA son chatbots configurables que pueden manejar el soporte al cliente en tu nombre. Cada agente tiene nombre, prompt de sistema, base de conocimiento y configuraciones de modelo. Los agentes pueden operar en modo **respuesta automática** o **supervisado**." },
        { q: "¿Qué es el modo supervisado para agentes de IA?", a: "En el modo **supervisado**, la IA genera un borrador de respuesta que revisas antes de enviarlo al cliente. En el modo **respuesta automática**, la IA envía la respuesta directamente. Cambia entre modos en la Barra de Comandos del Chat en la parte superior de la página de Chat." },
        { q: "¿Cómo agrego conocimiento a un agente?", a: "Abre **Agentes de IA**, edita un agente y ve a la pestaña **Base de Conocimiento**. Agrega temas con un título y contenido. Este conocimiento se inyecta en el contexto del agente para que pueda responder preguntas específicas de tu negocio." },
        { q: "¿Qué son los Flujos de Trabajo Recurrentes?", a: "Los Flujos de Trabajo Recurrentes son tareas que se repiten en un horario (diario, semanal, mensual, etc.). Ve a **Flujos de Trabajo → Recurrentes** y crea una tarea con frecuencia, fecha de inicio y propietario opcional. El sistema genera instancias de tareas automáticamente." },
      ],
    },
    {
      id: "settings",
      title: "Configuración y Cuenta",
      description: "Facturación, permisos y gestión de cuenta",
      articles: [
        { q: "¿Cómo gestiono mi suscripción?", a: "Ve a **Configuración → Facturación**. Puedes ver tu plan actual, consultar facturas anteriores y gestionar o actualizar tu suscripción." },
        { q: "¿Cómo funcionan los permisos de Control de Acceso?", a: "Los propietarios pueden invitar Usuarios del Estudio y otorgarles permisos específicos (Sesiones, Galerías, Reservas, etc.). Los usuarios solo ven las secciones a las que tienen acceso. Útil para asistentes o segundo fotógrafo." },
        { q: "¿Cómo cambio la moneda de mi negocio?", a: "Ve a **Configuración → Mi Perfil** y actualiza el campo **Moneda del Negocio**. Esto afecta cómo se muestran y cobran los precios en toda la plataforma." },
      ],
    },
    {
      id: "lightroom",
      title: "Plugin de Lightroom",
      description: "Sube fotos directamente desde Lightroom Classic",
      articles: [
        { q: "¿Cómo instalo el plugin de Lightroom?", a: "Ve a **Configuración → Personalizar → pestaña Galerías** y descarga el plugin DavionsConnect. En Lightroom Classic, ve a **Archivo → Administrador de Complementos**, haz clic en **Agregar** y selecciona la carpeta `.lrplugin` descargada." },
        { q: "¿Cómo subo fotos desde Lightroom?", a: "Selecciona las fotos que quieres exportar en Lightroom, luego ve a **Archivo → Exportar → Exportar con Ajuste Preestablecido → Davions** o usa el servicio de Publicación. Elige la galería de destino y haz clic en Exportar/Publicar." },
        { q: "El plugin no se conecta. ¿Qué hago?", a: "Asegúrate de estar logueado en la plataforma y de que tu clave de API esté correctamente ingresada en la configuración del plugin. Puedes regenerar tu clave de API en **Configuración → Personalizar → Galerías**. Consulta la página **Ayuda del Plugin LR** para pasos detallados de solución de problemas." },
      ],
    },
  ],
};

const categoryIcons: Record<string, React.ElementType> = {
  "getting-started": HelpCircle,
  "sessions": CalendarDays,
  "galleries": Images,
  "finance": DollarSign,
  "marketing": Globe,
  "ai": Bot,
  "settings": Settings,
  "lightroom": Camera,
};

const QUICK_START_IDS: Array<{ catId: string; articleIndex: number }> = [
  { catId: "getting-started", articleIndex: 2 },
  { catId: "sessions", articleIndex: 0 },
  { catId: "galleries", articleIndex: 1 },
  { catId: "ai", articleIndex: 0 },
];

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "en", label: "EN", flag: "🇺🇸" },
  { value: "pt", label: "PT", flag: "🇧🇷" },
  { value: "es", label: "ES", flag: "🇪🇸" },
];

function RichText({ text, highlight }: { text: string; highlight?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-medium text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
        }
        if (highlight && part.toLowerCase().includes(highlight.toLowerCase())) {
          const idx = part.toLowerCase().indexOf(highlight.toLowerCase());
          return (
            <span key={i}>
              {part.slice(0, idx)}
              <mark className="bg-muted text-foreground rounded-[2px] px-0.5 font-medium">
                {part.slice(idx, idx + highlight.length)}
              </mark>
              {part.slice(idx + highlight.length)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function ArticleRow({ article, highlight }: { article: Article; highlight?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-border last:border-0 transition-colors ${open ? "bg-muted/20" : ""}`}>
      <button
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-normal leading-snug text-foreground">
          <RichText text={article.q} highlight={highlight} />
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 mt-0.5 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <RichText text={article.a} highlight={highlight} />
          </p>
        </div>
      )}
    </div>
  );
}

const HelpCenter = () => {
  const { signOut, user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  const t = ui[lang];
  const rawCategories = categoriesData[lang];
  const categories: Category[] = rawCategories.map((c) => ({
    ...c,
    icon: categoryIcons[c.id] ?? HelpCircle,
  }));

  const totalArticles = categories.reduce((s, c) => s + c.articles.length, 0);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((cat) => ({ ...cat, articles: cat.articles.filter((a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)) }))
      .filter((cat) => cat.articles.length > 0);
  }, [query, lang]);

  const displayedCategories = useMemo(() => {
    if (query.trim()) return filteredCategories;
    if (activeCategory) return filteredCategories.filter((c) => c.id === activeCategory);
    return filteredCategories;
  }, [query, activeCategory, filteredCategories]);

  const totalResults = filteredCategories.reduce((s, c) => s + c.articles.length, 0);

  const quickStartArticles = useMemo(() =>
    QUICK_START_IDS.flatMap(({ catId, articleIndex }) => {
      const cat = categories.find((c) => c.id === catId);
      if (!cat || !cat.articles[articleIndex]) return [];
      return [{ cat, article: cat.articles[articleIndex] }];
    }),
    [lang]
  );

  const handleCategoryClick = useCallback((id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
    setQuery("");
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">

            {/* Hero */}
            <div className="border-b border-border bg-muted/20">
              <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{t.knowledgeBase}</span>
                  </div>
                  {/* Language switcher */}
                  <div className="flex items-center gap-1">
                    {LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setLang(opt.value); setQuery(""); setActiveCategory(null); }}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] tracking-wider border transition-colors rounded-none ${
                          lang === opt.value
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                        }`}
                      >
                        <span>{opt.flag}</span>
                        <span className="font-light">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-light tracking-tight">{t.howCanWeHelp}</h1>
                  <p className="text-sm text-muted-foreground">
                    {totalArticles} {t.articlesAcross} {categories.length} {t.categories}
                  </p>
                </div>
                <div className="relative max-w-xl">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t.searchPlaceholder}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveCategory(null); }}
                    className="pl-10 h-11 text-sm bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

              {/* Category chips */}
              {!query && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1.5 text-[11px] tracking-wider uppercase font-light border transition-colors rounded-none ${
                      !activeCategory
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {t.allCategories}
                  </button>
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wider uppercase font-light border transition-colors rounded-none ${
                          activeCategory === cat.id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search results label */}
              {query && (
                <p className="text-[11px] text-muted-foreground tracking-wide">
                  {totalResults} {totalResults !== 1 ? t.results : t.result} {t.resultsFor} &ldquo;{query}&rdquo;
                </p>
              )}

              {/* Quick Start */}
              {!query && !activeCategory && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <h2 className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground font-light">{t.quickStart}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickStartArticles.map(({ cat, article }, i) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveCategory(cat.id)}
                          className="group flex items-start gap-3 p-4 border border-border hover:border-foreground/30 hover:bg-muted/30 transition-all text-left"
                        >
                          <div className="mt-0.5 p-1.5 bg-muted rounded-sm shrink-0">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground mb-0.5">{cat.title}</p>
                            <p className="text-[13px] font-light text-foreground leading-snug">{article.q}</p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Articles */}
              {displayedCategories.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <p className="text-sm font-light text-muted-foreground">{t.noArticlesFound} &ldquo;{query}&rdquo;</p>
                  <p className="text-[12px] text-muted-foreground/60">{t.tryDifferent}</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {displayedCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <section key={cat.id}>
                        <div className="flex items-start gap-3 pb-3 border-b border-border">
                          <div className="p-1.5 bg-muted rounded-sm shrink-0 mt-0.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-[11px] tracking-[0.4em] uppercase text-foreground font-light">{cat.title}</h2>
                            {!query && <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{cat.description}</p>}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-light shrink-0 mt-0.5">
                            {cat.articles.length} {cat.articles.length !== 1 ? t.articles : t.article}
                          </Badge>
                        </div>
                        <div className="border border-border border-t-0">
                          {cat.articles.map((article, i) => (
                            <ArticleRow key={i} article={article} highlight={query || undefined} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {/* Footer CTA */}
              <div className="border border-border p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-light">{t.stillNeedHelp}</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{t.cantFind}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setBugReportOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-[12px] border border-border hover:border-foreground/50 hover:bg-muted/30 transition-colors"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    {t.reportBug}
                  </button>
                  <a
                    href="mailto:support@davions.app"
                    className="flex items-center gap-2 px-4 py-2 text-[12px] border border-border hover:border-foreground/50 hover:bg-muted/30 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t.emailSupport}
                  </a>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </SidebarProvider>
  );
};

export default HelpCenter;
