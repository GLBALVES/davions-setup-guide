
## Correção do overflow no cabeçalho das notificações

### Problema identificado
O botão continua “estourando” porque o layout atual soma vários fatores que aumentam demais a largura no português:
- `Button` herda estilos globais com `uppercase` + `tracking-widest`
- o texto da tradução em PT é longo: “Marcar todas como lidas”
- no cabeçalho, tanto o título quanto o botão estão com comportamento que evita encolhimento (`shrink-0` / `whitespace-nowrap`)
- o `PopoverContent` tem largura fixa (`w-[360px]`)

Resultado: no header do popover, o botão ultrapassa a largura disponível do focus group.

### O que vou ajustar
**Arquivo:** `src/components/dashboard/NotificationBell.tsx`

1. **Refazer o header para não quebrar o popover**
   - trocar o container do topo para um layout mais resiliente:
     - `flex-wrap`
     - `items-start`
     - `gap-2`
   - permitir que o título ocupe a linha disponível sem forçar overflow

2. **Compactar visualmente o botão**
   - remover os estilos que aumentam artificialmente a largura no contexto desse botão:
     - `uppercase`
     - `tracking-widest`
   - usar classes locais no botão como:
     - `normal-case`
     - `tracking-normal`
     - `px-2` ou `px-2.5`
     - `text-[11px]`
     - `leading-none` ou `leading-tight`

3. **Evitar estouro em qualquer idioma**
   - remover o `whitespace-nowrap` do botão
   - permitir quebra controlada em 2 linhas se necessário
   - manter o ícone, mas com espaçamento menor

4. **Se necessário, ajustar largura do popover**
   - aumentar levemente de `w-[360px]` para algo como `w-[380px]`
   - ou usar `max-w-[calc(100vw-2rem)]` para evitar corte em telas menores

### Abordagem recomendada
Vou priorizar uma solução que **não dependa de encurtar o texto traduzido**:
- header com wrap
- botão com casing normal e tracking normal
- largura mais econômica

Assim o componente continua correto em inglês, português e espanhol.

### Resultado esperado
- o botão fica totalmente dentro do cabeçalho
- o focus group não é ultrapassado
- a versão em português deixa de quebrar o layout
- o topo do popover continua visualmente organizado

### Detalhes técnicos
A principal causa não é só o texto longo, mas o uso do componente `Button`, que aplica por padrão:
```tsx
"whitespace-nowrap ... tracking-widest uppercase"
```
Então, mesmo com fonte menor, o botão continua largo demais. A correção precisa sobrescrever esse comportamento especificamente no `NotificationBell`, e também permitir que o header quebre linha quando o espaço horizontal não for suficiente.

### Validação após implementar
- abrir o sino em PT, EN e ES
- testar com notificações não lidas e sem notificações
- confirmar que o botão não sai da borda do popover
- confirmar que o header continua alinhado em desktop nessa largura atual
