
## Adicionar Realtime na Página de Galerias

### Problema
A página `Galleries.tsx` carrega os dados apenas uma vez no `useEffect` inicial. Quando o plugin do Lightroom atualiza o nome/título de uma galeria via Edge Function `update-gallery`, a página não reflete essa mudança automaticamente.

### Solução
Adicionar uma subscription Supabase Realtime na tabela `galleries` dentro do `useEffect` existente em `Galleries.tsx`. Quando qualquer evento (`INSERT`, `UPDATE`, `DELETE`) ocorrer na tabela para o fotógrafo autenticado, a lista é re-buscada automaticamente.

O mesmo padrão já existe no `GalleryDetail.tsx` para fotos, então seguimos exatamente esse modelo.

### Mudança em `src/pages/dashboard/Galleries.tsx`

Substituir o `useEffect` simples (linha 126-128) por um que:
1. Chama `fetchGalleries()` na montagem (igual ao atual)
2. Abre um canal Realtime na tabela `galleries` escutando todos os eventos (`*`)
3. Em cada evento, chama `fetchGalleries()` para resincronizar
4. Faz cleanup do canal no unmount

```text
useEffect(() => {
  fetchGalleries();

  const channel = supabase
    .channel("galleries-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "galleries" }, () => {
      fetchGalleries();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### Arquivo a editar
| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/Galleries.tsx` | Substituir useEffect por versão com subscription Realtime |

> **Nota**: A tabela `galleries` já suporta RLS corretamente, então o Realtime só entregará eventos de galerias do fotógrafo autenticado.
