

## Relatório de Inconsistências — Modal de Assinatura

### Erros Encontrados

---

**1. Upload usa `getPublicUrl` em bucket PRIVADO**
- O bucket `email-documents` é **privado** (`Is Public: No`)
- Linha 1034: `supabase.storage.from('email-documents').getPublicUrl(data.path)` retorna URL inacessível (403)
- **Resultado:** Imagem é "inserida" mas aparece quebrada no editor e na assinatura salva
- **Correção:** Usar `createSignedUrl` com expiração longa, OU tornar o bucket público, OU criar um sub-bucket `signatures` público

**2. Chaves i18n inconsistentes entre modal e código**
- O modal usa `t('settings.editSignature')` e `t('settings.newSignature')` (linha 2037), mas as chaves existem em `signaturesModal.editSignature` / `signaturesModal.newSignature`
- Usa `t('settings.content')` (linha 2041) — existe como `signaturesModal.content`
- Usa `t('settings.useInAccount')` (linha 2120) — existe como `signaturesModal.useInAccount`
- Usa `t('settings.insertImage')` (linhas 2064, 2067) — **não existe** em nenhum locale
- Usa `t('settings.textColor')` (linha 2050) — existe como `editor.textColor`
- Usa `t('common.insert')` (linha 2092) — **não existe** nos locales de email
- **Resultado:** Textos caem nos fallbacks hardcoded em PT, quebrando i18n em EN/ES

**3. Warning no console: "Function components cannot be given refs"**
- `DialogFooter` está recebendo uma ref indiretamente — warning do React
- **Correção:** Adicionar `aria-describedby={undefined}` ao `DialogContent` (resolve também o warning "Missing Description")

**4. `handleSalvarAssinatura` não lê conteúdo final do editor antes de salvar**
- Linha 951 lê `sigEditorRef.current.innerHTML`, mas se o editor estiver vazio (primeira renderização antes do useEffect sync), pode salvar string vazia
- **Correção:** Adicionar guard `|| formAssinatura.conteudo` como fallback mais robusto

**5. Toolbar Bold/Italic/Underline não restaura seleção**
- Linhas 2044-2046: Chamam `sigEditorRef.current?.focus()` + `execCommand`, mas não chamam `saveSigSelection/restoreSigSelection`
- Se o usuário seleciona texto e clica Bold, a seleção pode se perder em alguns navegadores
- **Correção:** Adicionar `onMouseDown={saveSigSelection}` nos botões B/I/U e chamar `restoreSigSelection()` antes do `execCommand`

**6. Color picker e Image popover não fecham ao salvar/cancelar modal**
- Ao fechar o modal, `sigImgPopover` é resetado (linha 2035), mas o Popover de cor (linha 2048) não tem controle de estado — permanece aberto se o dialog fechar enquanto estiver visível
- Não é crítico mas causa flash visual

---

### Plano de Correção

**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

1. **Upload privado → URL assinada**: Trocar `getPublicUrl` por `createSignedUrl(data.path, 60 * 60 * 24 * 365)` (1 ano) para funcionar com bucket privado
2. **Corrigir todas as chaves i18n**: Mapear para os namespaces corretos (`signaturesModal.*`, `editor.*`) e adicionar chaves faltantes (`insertImage`, `insert`) nos 3 locales
3. **Adicionar `aria-describedby={undefined}`** ao `DialogContent` do modal de assinatura
4. **Adicionar `onMouseDown={saveSigSelection}`** nos botões B/I/U para preservar seleção
5. **Adicionar chaves i18n faltantes** nos 3 arquivos de locale:
   - `signaturesModal.insertImage`: "Inserir imagem" / "Insert image" / "Insertar imagen"
   - `common.insert`: "Inserir" / "Insert" / "Insertar"

**Arquivos modificados:**
- `src/components/admin/AdminEmailManager.tsx`
- `src/i18n/locales/email-pt.json`
- `src/i18n/locales/email-en.json`
- `src/i18n/locales/email-es.json`

