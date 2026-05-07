## Contexto

Hoje o formulário de **One Session** (em `CreateBookingDialog.tsx`, etapa 1B) já tem:
- Nome, duração, nº de fotos, preço, local, contrato, briefing e itens incluídos.

A ideia é **enriquecer** sem virar uma "session normal" (que tem disponibilidade pública, slots, add-ons cadastrados, store, SEO, galerias automáticas, etc.). One Session continua sendo uma sessão **ad-hoc, privada, criada pelo fotógrafo direto na agenda**.

## Sugestão de novos campos

Organizados em uma seção colapsável **"Mais detalhes (opcional)"** logo abaixo dos campos atuais, para não poluir a tela inicial.

### 1. Comerciais / financeiros
- **Desconto** (valor ou %) — aplicado direto no total exibido ao cliente.
- **Sinal / depósito** (valor fixo ou %) — quanto o cliente paga para confirmar.
- **Forma de pagamento prevista** (Pix / cartão / dinheiro / transferência / outro) — só anotação interna.
- **Vencimento do saldo** (data ou "no dia da sessão" / "X dias após").
- **Imposto / taxa** (%) — opcional, calcula no resumo.

### 2. Entrega
- **Prazo de entrega das fotos** (dias úteis, ex: 15).
- **Formato de entrega** (galeria online / pendrive / WeTransfer / link).
- **Quantidade mínima garantida** vs. **quantidade estimada** (separar dos "nº de fotos" atual).
- **Inclui edição?** (toggle) + **nível de edição** (básica / avançada).
- **Fotos extras** — preço por foto adicional (caso o cliente queira mais que o pacote).

### 3. Logística da sessão
- **Tipo de local** (estúdio / externa / casa do cliente / evento).
- **Endereço completo** (separado do "Location" curto atual).
- **Custo de deslocamento** (valor) — entra no resumo.
- **Equipe envolvida** (multiselect de membros do studio, se houver) ou texto livre.
- **Equipamento especial** (texto curto: drone, iluminação extra, etc.).

### 4. Cliente / experiência
- **Quantidade de pessoas** na sessão.
- **Trocas de roupa / looks** incluídos (número).
- **Pets / crianças?** (toggles informativos).
- **Observações internas** (textarea, só o fotógrafo vê).
- **Observações para o cliente** (textarea, aparece no e-mail/contrato).

### 5. Pós-sessão
- **Permite uso comercial das fotos?** (toggle).
- **Direito de arrependimento / política de cancelamento** (texto curto ou seleção de presets).
- **Tags internas** (categorização rápida: "amiga", "indicação", "teste", etc.).

## Recomendação prática (MVP enxuto)

Se a ideia é **não inflar** a One Session, sugiro adicionar **agora** apenas o conjunto que mais impacta gestão e cobrança:

1. **Sinal/depósito** (valor ou %)
2. **Desconto** (valor ou %)
3. **Prazo de entrega** (dias)
4. **Fotos extras — preço unitário**
5. **Endereço completo** (separado do Location curto)
6. **Quantidade de pessoas**
7. **Observações internas** (privado)
8. **Observações para o cliente** (público no contrato/e-mail)

Tudo dentro de um accordion **"Mais detalhes (opcional)"**, mantendo a tela inicial igual de simples.

## Estrutura técnica sugerida

- Em vez de criar 8 colunas novas em `sessions`, usar uma coluna JSONB existente (ex: `metadata` ou criar `one_session_details jsonb`) só para One Session.
- O resumo financeiro (preço − desconto + extras + deslocamento + imposto = total; sinal; saldo) é calculado no frontend e mostrado no Step 2 e no contrato.
- i18n: adicionar chaves em `t.createBooking` para EN/PT/ES.

## Pergunta antes de implementar

Quer que eu siga com o **MVP enxuto (8 campos)** acima, ou prefere escolher outro recorte da lista completa?
