

## Mostrar De/Para no painel de detalhe do email

### Problema
O `renderRightPanel` (linha 966-973) só mostra o remetente. Para emails enviados, não aparece para quem foi enviado. O usuário precisa ver os dois endereços.

### Correção
**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

**Linhas 966-973** — Expandir o bloco de informações do email para:
- Mostrar "De: remetente \<emailRemetente\>" sempre
- Se o email for do tipo `"enviado"`, mostrar também "Para: destinatario \<emailDestinatario\>" abaixo

O campo `emailDestinatario` já existe no tipo `EmailEnviado` (linha 63) e já é preenchido na linha 723.

Layout esperado:
```text
[Avatar] De: Partners <partners@davions.com>  19:14
         Para: João <joao@email.com>
```

Uma alteração pequena no bloco de renderização do header dentro de `renderRightPanel`.

