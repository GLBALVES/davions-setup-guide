## Fluxo Completo One Session — Implementação

### Visão Geral
Após o fotógrafo criar um agendamento via One Session, o sistema envia um link por e-mail ao cliente. O cliente acessa uma página pública para finalizar: ver detalhes, responder briefing, assinar contrato e fazer pagamento. O fotógrafo pode adicionar itens extras na invoice durante a sessão.

### Etapas de Implementação

#### Etapa 1: Página pública do cliente para One Session
- Criar rota pública `/booking/:bookingId/confirm`
- Reutilizar componentes existentes do BookingSuccess (briefing, contrato)
- Exibir: detalhes da sessão, data/hora, local, itens inclusos
- Tabs: Detalhes → Briefing → Contrato → Pagamento
- Pagamento: mesmo fluxo Stripe da sessão normal (depósito + saldo)
- Fotos extras e adicionais: mesmo do fluxo normal

#### Etapa 2: Envio de e-mail ao cliente
- Após criar One Session booking, enviar e-mail via Brevo com link da página de confirmação
- Template com dados da sessão (nome, data, hora, fotógrafo)
- Botão CTA "Finalizar Agendamento"

#### Etapa 3: Invoice com itens adicionais livres
- No ProjectDetailSheet (aba Payments), permitir adicionar itens livres: descrição, valor, quantidade
- Tabela `booking_invoice_items` (nova) com: booking_id, description, unit_price, quantity, created_at
- Itens cobrados no pagamento restante (saldo)
- Fotógrafo adiciona durante ou após a sessão

#### Etapa 4: Salvar como preset (opcional)
- Após criar One Session, modal perguntando "Deseja salvar como sessão reutilizável?"
- Se sim: converte session_model para 'standard' e redireciona para edição completa
- Se não: mantém como one_session (rascunho) na aba One Sessions

#### Etapa 5: Referência futura
- One Sessions ficam na aba separada em Sessions (já implementado)
- Aparecem também vinculadas aos bookings/projetos no Workflow
- Fotógrafo pode completar o cadastro a qualquer momento convertendo em sessão padrão

### Detalhes Técnicos
- A página do cliente é pública (sem auth), acessada via link único com booking ID
- Briefing e contrato são opcionais (depende se foram configurados na One Session)
- Pagamento usa Stripe Checkout existente via `create-session-checkout`
- Invoice items são uma nova tabela com RLS para o fotógrafo
- E-mail enviado via edge function existente `send-client-email` ou nova função dedicada

### Ordem: Etapa 1 → 2 → 3 → 4 (5 já está pronto)