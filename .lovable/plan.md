

## Permitir confirmar agendamento manual mesmo com conflito de horário

### Contexto
Atualmente, quando há conflito de horário no `CreateBookingDialog` (agendamento manual), o botão de salvar é desabilitado e o fotógrafo não pode prosseguir. O objetivo é manter o aviso de conflito, mas permitir que o fotógrafo confirme mesmo assim, com uma etapa de confirmação extra (AlertDialog).

### Plano

**1. Remover o bloqueio por conflito no `CreateBookingDialog.tsx`**

- Alterar `isValid` para não considerar `hasConflict` como impeditivo
- Remover o `if (hasConflict) return;` do `handleSubmit`
- Manter os avisos visuais de conflito (os banners amarelos/vermelhos permanecem)

**2. Adicionar AlertDialog de confirmação ao submeter com conflito**

- Quando o fotógrafo clicar em "Create Booking" e houver conflito, exibir um AlertDialog perguntando se deseja continuar mesmo com o conflito
- Se confirmar, prosseguir com a criação normalmente
- Se cancelar, voltar ao formulário
- Usar o `AlertDialog` já importado no componente

**3. Traduzir os textos do AlertDialog**

- Adicionar as strings para EN, PT e ES no arquivo de traduções

### Arquivos alterados
- `src/components/dashboard/schedule/CreateBookingDialog.tsx` — lógica de conflito + AlertDialog
- `src/lib/i18n/translations.ts` — novas strings

