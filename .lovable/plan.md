

## Adicionar Hostinger como preset de provedor

### O que será feito
Adicionar "Hostinger" como opção de provedor no módulo de e-mail, com preenchimento automático das configurações IMAP/SMTP.

### Alterações no arquivo `src/components/admin/AdminEmailManager.tsx`

**1. Adicionar preset na linha 88** (após `icloud`):
```typescript
hostinger: { imap: { servidor: "imap.hostinger.com", porta: 993, seguranca: "ssl" }, smtp: { servidor: "smtp.hostinger.com", porta: 465, seguranca: "ssl" } },
```

**2. Adicionar opção no Select** (após a linha do iCloud, ~1521):
```tsx
<SelectItem value="hostinger">Hostinger</SelectItem>
```

**3. Atualizar o tipo `Conta["provedor"]`** para incluir `"hostinger"` se houver tipagem restrita.

Uma alteração mínima em um único arquivo.

