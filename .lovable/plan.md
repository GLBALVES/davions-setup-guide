

## Relatório de Erros — Email Enviado com Tags HTML Visíveis

### O que aconteceu
O email recebido via `partners@davions.com` exibe as tags HTML cruas (`<p>`, `<br>`, `&nbsp;`) em vez de renderizá-las. O destinatário vê código HTML como texto.

### Lista de erros identificados

---

**1. Quill inicializa com `setText()` em vez de `dangerouslyPasteHTML()`**
- **Arquivo:** `AdminComposeModal.tsx`, linha 160
- `q.setText(initialCorpo)` trata o conteúdo como texto puro, escapando todas as tags HTML
- Se o `initialCorpo` já contém HTML (por exemplo, de um forward ou resposta), o Quill armazena as tags como texto literal
- **Resultado:** O `innerHTML` do editor contém `&lt;p&gt;` ao invés de `<p>`

**2. O `corpo` enviado ao SMTP pode conter HTML duplo-escapado**
- **Arquivo:** `AdminComposeModal.tsx`, linha 422
- `quillRef.current?.root?.innerHTML` captura o HTML interno do editor
- Se o Quill recebeu HTML via `setText()` (problema 1), o innerHTML terá as tags escapadas como entidades HTML
- O SMTP envia esse conteúdo no `Content-Type: text/html`, mas o conteúdo real são entidades escapadas, não HTML válido

**3. A assinatura é inserida via `onSelecionarAssinatura` mas sem integração no editor**
- **Arquivo:** `AdminEmailManager.tsx`, linhas 1864-1866
- Quando o usuário seleciona uma assinatura, ela atualiza `conta.assinatura` no estado, mas **não injeta no editor Quill**
- A assinatura selecionada nunca aparece no corpo do email

**4. Geração de IA usa `dangerouslyPasteHTML` mas forward/reply usa `setText`**
- Inconsistência: `handleGerarIA` (linha 209) e `handleMelhorarTexto` (linha 228) usam corretamente `dangerouslyPasteHTML`
- Mas a inicialização do editor (linha 160) usa `setText`, que escapa HTML
- Emails encaminhados ou respondidos perdem toda formatação

**5. Email sem assunto visível**
- No screenshot, o campo "Assunto:" aparece vazio na mensagem recebida
- O `Subject` no SMTP usa encoding Base64 UTF-8 (linha 130), que está correto — mas se o assunto estava vazio no formulário, chega vazio

**6. Ausência de validação de corpo antes do envio**
- **Arquivo:** `admin-send-email/index.ts`, linha 27
- Valida `contaId`, `para` e `assunto`, mas **não valida `corpo`**
- Um email pode ser enviado com corpo vazio ou com conteúdo malformado

### Correções necessárias

**Arquivo:** `src/components/admin/AdminComposeModal.tsx`
1. **Linha 160:** Trocar `q.setText(initialCorpo)` por `q.clipboard.dangerouslyPasteHTML(0, initialCorpo)` para preservar HTML do conteúdo inicial
2. **Adicionar injeção da assinatura no editor** quando `onSelecionarAssinatura` é chamada — inserir o HTML da assinatura no final do conteúdo Quill
3. **Validar corpo não-vazio** antes de permitir envio

**Arquivo:** `supabase/functions/admin-send-email/index.ts`
4. **Adicionar validação de `corpo`** — retornar erro 400 se vazio

### Resumo visual do fluxo do bug

```text
Usuário compõe email → Quill.setText(html) → Tags viram texto
                                              ↓
Editor.innerHTML = "&lt;p&gt;Olá&lt;/p&gt;"
                                              ↓
SMTP envia como text/html → Cliente de email mostra "<p>Olá</p>"
```

