

## Upgrade do Modal de Assinatura com Editor Rich Text e Suporte a Imagens

### O que muda
O modal de assinatura atual usa um `<Textarea>` simples (texto puro). Será substituído por um editor `contentEditable` com toolbar de formatação e inserção de imagens (upload ou URL), com resize visual.

### Arquivo alterado
`src/components/admin/AdminEmailManager.tsx`

### 1. Novos states e refs (junto aos existentes, ~linha 532)
- `sigImgInputRef`, `sigEditorRef`, `sigSavedRange` (refs)
- `sigImgPopover`, `sigImgUrl`, `sigImgUrlInput`, `sigImgWidth`, `sigImgUploading` (controle do popover de imagem)
- `sigSelectedImg`, `sigResizePos`, `sigResizeRef` (toolbar de resize flutuante)
- Array `sigImgSizes` com tamanhos P/M/G/GG

### 2. Novos handlers/effects (~após linha 949)
- **useEffect** para fechar toolbar de resize ao clicar fora
- **handleSigEditorClick** — detecta clique em `<img>` dentro do editor e posiciona toolbar
- **handleSigImgResize** — altera width da imagem selecionada
- **useEffect** para sincronizar `innerHTML` do editor ao abrir modal
- **saveSigSelection / restoreSigSelection** — salva/restaura cursor para inserir imagem na posição correta
- **handleSigImgUpload** — upload para Storage bucket `email-documents` (com fallback base64)
- **handleSigImgInsert** — insere `<img>` via `insertHTML`
- Atualizar **handleSalvarAssinatura** para ler do `sigEditorRef.current.innerHTML`

### 3. Substituir modal UI (linhas 1917-1939)
Trocar o `<Textarea>` por:
- **Toolbar** com botões: Bold, Italic, Underline, color picker, inserir imagem (Popover com abas Upload/URL + slider de tamanho)
- **Editor `contentEditable`** (`sigEditorRef`) com `min-h-[150px]`, `onInput` sincronizando `formAssinatura.conteudo`, `onClick={handleSigEditorClick}`
- **Toolbar flutuante de resize** (aparece ao clicar numa imagem) com botões P/M/G/GG
- Manter campo Nome e checkboxes de contas inalterados

### 4. Bucket Storage
O bucket `email-documents` já existe. O upload usa path `{userId}/signatures/{timestamp}-{filename}`.

### Resultado
```text
┌─ Nova Assinatura ──────────────────────┐
│ Nome: [______________]                 │
│                                        │
│ [B] [I] [U] [🎨] [📷 Imagem]          │
│ ┌────────────────────────────────────┐ │
│ │ Editor rich text contentEditable   │ │
│ │ com imagens redimensionáveis       │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Usar na conta: ☑ Partners  ☐ Noreply   │
│                    [Cancelar] [Salvar]  │
└────────────────────────────────────────┘
```

