

## Aumentar espaçamento da barra de progresso

### Problema
O tooltip flutuante (label com dias/horas restantes) que acompanha a barra de progresso está sobrepondo o elemento acima porque o `mt-1` é insuficiente e o label usa `-top-4` posicionando-se acima da barra.

### Solução
Aumentar a margem superior do container da barra de progresso de `mt-1` para `mt-4`, garantindo espaço suficiente para o tooltip flutuante não sobrepor o conteúdo acima.

### Arquivo
- `src/pages/dashboard/Projects.tsx` — linha 507: trocar `mt-1` por `mt-4` no `div` container da barra de progresso.

