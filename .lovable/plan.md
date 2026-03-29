

## Adicionar busca nas abas Enviados, Favoritos e Por Remetente

### Problema
A barra de busca (filtro por texto) só existe na aba "Entrada" (recebidos). As abas Enviados, Favoritos e Por Remetente não têm nenhum campo de busca.

### Correção
**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

#### 1. Criar listas filtradas para cada aba
Reutilizar o state `filtroTexto` que já existe. Adicionar `useMemo` para:
- `filteredEnviados` — filtra `enviados` por `destinatario`, `assunto`, `preview`
- `filteredFavoritos` — filtra `favoritoEmails` por `remetente`, `assunto`, `preview`
- `filteredRemetenteGroups` — filtra `remetenteGroups` por endereço/nome do remetente

#### 2. Adicionar barra de busca nas 3 abas
Extrair o bloco de busca (input + ícone Search + botão limpar) em um mini-componente ou duplicar o padrão já usado em `renderEntrada` (linhas 1051-1056) dentro de:
- `renderEnviados` (linha 1087)
- `renderFavoritos` (linha 1099)
- `renderPorRemetente` (linha 1117)

Cada aba terá o mesmo input visual conectado ao `filtroTexto`/`filtroTextoInput` existente (state compartilhado entre abas).

#### 3. Usar listas filtradas no render
- `renderEnviados`: trocar `enviados.map(...)` por `filteredEnviados.map(...)`
- `renderFavoritos`: trocar `favoritoEmails.map(...)` por `filteredFavoritos.map(...)`
- `renderPorRemetente`: trocar `remetenteGroups.map(...)` por `filteredRemetenteGroups.map(...)`

### Resultado esperado
```text
Qualquer aba → campo de busca no topo da lista
Digitar texto → filtra cards em tempo real
Limpar → volta a lista completa
```

