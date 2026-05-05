# Workflow de Emails — Jornada do Cliente em 7 Etapas

Reorganiza o painel de emails automáticos seguindo a jornada real do cliente (do fechamento da sessão ao pós-entrega) e implementa os disparadores que ainda não existem.

## Nova ordem de gatilhos (jornada)

| # | Chave (key) | Quando dispara |
|---|---|---|
| 1 | `booking_confirmed` | Cliente fecha/paga a sessão (boas-vindas) |
| 2 | `session_completed` | Após data+hora do ensaio terminar (agradecimento + próxima etapa) |
| 3 | `proof_gallery_sent` | Galeria de provas é publicada |
| 4 | `selection_completed` | Cliente finaliza seleção de fotos (vai para fila de pós) |
| 5 | `final_gallery_sent` | Galeria final é publicada |
| 6 | `download_reminder_7d` | 7 dias após envio da galeria final, se cliente não baixou |
| 7 | `post_delivery_feedback_7d` | 7 dias após o cliente baixar as fotos (agradecimento + feedback) |

Os lembretes pré-sessão (`reminder_14_days`, `reminder_7_days`, `reminder_1_day`) continuam existindo, agora agrupados separadamente como "Pré-sessão".

Triggers antigos (`shot_to_editing`, `editing_to_review`, `review_to_delivered`, `delivered_to_done`, `gallery_linked`) deixam de aparecer no painel — os registros já salvos no banco ficam preservados, mas ocultos da UI (não removidos para não quebrar histórico).

## Mudanças na UI (`WorkflowEmailTemplates.tsx`)

- Substituir `STAGE_TRIGGERS` pelas 7 chaves novas + as 3 de pré-sessão.
- Reescrever `triggerMeta` com labels/descrições nos 3 idiomas (EN/PT-BR/ES) via `LanguageContext`.
- Sidebar com 3 grupos, nesta ordem:
  1. **Jornada do cliente** — as 7 etapas numeradas (1–7) na ordem acima
  2. **Pré-sessão** — 14d / 7d / 1d
- Adicionar variáveis novas em `VARIABLES` e `SAMPLE_PREVIEW`:
  - `{{selection_deadline}}`, `{{final_delivery_eta}}`, `{{download_link}}`, `{{feedback_link}}`
- Configurações por template (já existem): nome interno, remetente, BCC, atraso em minutos, ativo/inativo, auto-envio, preview, teste, histórico.

## Backend — pontos de disparo

Criar uma edge function única `send-workflow-email` (versão "real" da `send-workflow-email-test` já existente). Recebe `{ photographer_id, trigger, project_id|booking_id, recipient, vars }`, busca o template ativo, renderiza variáveis, envia via Brevo, grava em `workflow_email_logs` com `is_test=false`.

Pontos de chamada:

| Trigger | Onde plugar |
|---|---|
| `booking_confirmed` | `session-booking-webhook` (após `payment_status='paid'`) |
| `proof_gallery_sent` | ao publicar galeria do tipo "proofs" (toggle de `galleries.status`) |
| `selection_completed` | endpoint/ação que finaliza seleção do cliente |
| `final_gallery_sent` | ao publicar galeria final |
| `session_completed` | cron horário que varre `bookings` cuja `booked_date + hora` < now() e ainda não tiveram disparo |
| `download_reminder_7d` | cron diário: galerias finais publicadas há ≥7d sem download registrado |
| `post_delivery_feedback_7d` | cron diário: 7d após primeiro download registrado |

Schema:

- Adicionar coluna `last_download_at timestamptz` em `galleries` (se não existir) — atualizada no endpoint de download.
- Adicionar tabela auxiliar `workflow_email_dispatched (project_id, trigger, sent_at)` com unique `(project_id, trigger)` para evitar reenvio pelos crons.

Cron (pg_cron + pg_net) chamando a edge function dispatcher horária/diária.

## Detalhes técnicos

- Migration: nova tabela `workflow_email_dispatched`, coluna `galleries.last_download_at`, RLS por `photographer_id`.
- Edge functions:
  - `send-workflow-email` (novo, dispatcher real, reusa lógica de render do test).
  - `workflow-email-cron` (novo, varre bookings/galleries e chama dispatcher).
- Hook em `session-booking-webhook` para `booking_confirmed`.
- Hooks no fluxo de publicar galeria (proofs/final) e finalizar seleção.
- i18n: adicionar chaves em `LanguageContext` para os 7 novos labels/desc nos 3 idiomas.
- Manter compatibilidade: registros antigos em `workflow_email_templates` com triggers descontinuados não são deletados; UI apenas não os lista.

## Fora de escopo

- Editor visual de novos campos custom além das variáveis listadas.
- Migração automática de conteúdo dos templates antigos para os novos (usuário recria — só existem ~5 e nenhum cliente em produção tem esses templates configurados ainda neste fluxo).
