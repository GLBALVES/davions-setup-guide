

## Substituir assinatura fixa por dropdown e injeção automática no editor

### O que muda
- Remove a seção de assinatura estática abaixo do editor (texto "-- Atenciosamente..." com link "Editar assinatura")
- Adiciona um dropdown de seleção de assinatura no footer do modal (ao lado dos botões)
- Ao abrir o modal, injeta automaticamente a assinatura padrão da conta selecionada no final do editor Quill
- Ao trocar assinatura no dropdown, substitui a assinatura anterior no editor

### Arquivo alterado
`src/components/admin/AdminComposeModal.tsx`

### Mudanças

**1. Novo estado para rastrear assinatura ativa**
```typescript
const [assinaturaAtiva, setAssinaturaAtiva] = useState<string | null>(null);
```

**2. Remover seção estática de assinatura (linhas 401-409)**
O bloco `{/* SIGNATURE */}` com o texto fixo e link "Editar assinatura" é removido inteiramente.

**3. Injetar assinatura padrão ao inicializar o editor**
No `initQuill`, após inserir o `initialCorpo`, encontrar a assinatura padrão da conta (primeira assinatura que contenha o `contaId` selecionado, ou `selectedConta.assinatura`) e injetar no final do editor com separador `--`.

**4. Adicionar dropdown de assinatura no footer**
No footer (linha 412), adicionar um `DropdownMenu` com as assinaturas disponíveis. Ao selecionar uma:
- Remove a assinatura anterior do editor (busca pelo separador `--`)
- Injeta a nova assinatura no final
- Atualiza `assinaturaAtiva`

**5. Função `injectSignature` / `replaceSignature`**
```typescript
const injectSignature = (html: string) => {
  const q = quillRef.current;
  if (!q) return;
  // Remove assinatura anterior (tudo após "--\n")
  const text = q.getText();
  const sepIdx = text.lastIndexOf("\n--\n");
  if (sepIdx >= 0) q.deleteText(sepIdx, q.getLength() - sepIdx);
  // Insere nova
  const len = q.getLength();
  q.clipboard.dangerouslyPasteHTML(len - 1, "\n--\n" + html);
};
```

**6. Remover modal de seleção de assinatura (Dialog linhas 459-509)**
O modal separado de seleção de assinaturas é substituído pelo dropdown inline no footer, simplificando o fluxo.

### Layout do footer atualizado
```text
┌──────────────────────────────────────────────────────┐
│ 📎 ANEXAR  0 anexos   [✍ Assinatura ▾]  DESCARTAR  │ SALVAR RASCUNHO │ ▶ ENVIAR │
└──────────────────────────────────────────────────────┘
```

