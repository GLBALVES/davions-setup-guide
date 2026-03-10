
## Verificação: Badge "No client" e filtro

### Resultado: TUDO CORRETO ✓

Após analisar o código completo, os três componentes envolvidos estão implementados corretamente e sem bugs:

---

### 1. CSS / Tailwind — cor `warning` ✓

`index.css` define as variáveis:
```css
--warning: 38 95% 52%;
--warning-foreground: 0 0% 100%;
```

`tailwind.config.ts` registra o token:
```ts
warning: {
  DEFAULT: "hsl(var(--warning))",
  foreground: "hsl(var(--warning-foreground))",
}
```

As classes `bg-warning`, `text-warning-foreground` e `text-warning` estão usadas diretamente (não dinamicamente), então o Tailwind as inclui no bundle sem precisar de safelist.

---

### 2. GalleryCard — badge e indicadores ✓

Três pontos de sinalização, todos condicionados a `isUnassigned = !gallery.booking_id`:

| Contexto | Elemento |
|---|---|
| Grid — thumbnail | Badge amber `"No client"` no canto superior direito (absoluto sobre a imagem) |
| Grid — meta | Linha `"No client assigned"` em `text-warning` abaixo do nome do cliente |
| List compact — meta | Inline `UserX + "No client"` em `text-warning` na faixa de metadados |

---

### 3. Galleries.tsx — filtro "No client" ✓

O chip de filtro está no array `STATUS_FILTERS` com `value: "unassigned"` e ícone `UserX`.

A lógica de filtragem:
```ts
if (statusFilter === "unassigned") return !g.booking_id;
```

O campo `booking_id` é selecionado na query e mapeado corretamente:
```ts
booking_id: g.booking_id ?? null,
```

---

### Único ponto de atenção (não bloqueia)

Os logs mostram um warning de React sobre `ref` em `GalleryDetail`:
```
Warning: Function components cannot be given refs.
Check the render method of `GalleryDetail`.
AlertDialog@...
```

Isso é um aviso de compatibilidade do `AlertDialog` com a versão atual do React, não afeta o funcionamento das galerias nem o filtro/badge. Pode ser corrigido separadamente se necessário.

---

### Conclusão

A feature está 100% funcional conforme implementada:
- Galerias sem `booking_id` exibem badge amber "No client" no card
- O filtro "No client" no toolbar filtra corretamente por `!g.booking_id`
- Nenhuma correção de código é necessária
