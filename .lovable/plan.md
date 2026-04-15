

## Plan: Tornar o modal de waitlist permanente e impossível de fechar

### Problema
Após preencher o formulário, o modal fecha após 2.5 segundos, permitindo acesso ao site.

### Correção em `src/components/WaitlistModal.tsx`
1. Remover o `setTimeout(() => setOpen(false), 2500)` — o modal nunca fecha após submit
2. Remover o `if (!open) return null` — o modal sempre renderiza
3. Remover o estado `open` completamente — não há cenário onde o modal some
4. Manter a mensagem de sucesso visível indefinidamente após o envio

### Arquivo
- `src/components/WaitlistModal.tsx`

